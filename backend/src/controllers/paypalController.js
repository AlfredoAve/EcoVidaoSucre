const express = require('express');
const PayPalService = require('../services/paypalService');
const OrdenesRepository = require('../repositories/ordenesRepository');
const CarritoRepository = require('../repositories/carritoRepository');
const ProductosRepository = require('../repositories/productosRepository');
const Orden = require('../models/Orden');
const authMiddleware = require('../middleware/authMiddleware');
const { crearErrorPerfilIncompleto } = require('../utils/perfilValidation');
const NotificacionesRepository = require('../repositories/notificacionesRepository');

const router = express.Router();
const PAYPAL_USD_RATE = 6.96;

function calcularTotal(items) {
  return items.reduce((sum, item) => {
    const precio = Number(item.precioUnitario ?? item.precio) || 0;
    const cantidad = Number(item.cantidad) || 0;
    return sum + (precio * cantidad);
  }, 0);
}

function obtenerDireccionEnvio(usuario) {
  if (!usuario) return 'Sin dirección registrada';

  const partes = [
    usuario.direccion,
    usuario.ciudad,
    usuario.telefono ? `Tel: ${usuario.telefono}` : null
  ].filter(Boolean);

  return partes.length > 0 ? partes.join(', ') : 'Sin dirección registrada';
}

// POST /api/paypal/crear-orden
router.post('/crear-orden', authMiddleware, async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const UserRepository = require('../repositories/userRepository');
    const usuario = await UserRepository.obtenerPorId(usuarioId);
    const errorPerfil = crearErrorPerfilIncompleto(usuario);

    if (errorPerfil) {
      return res.status(400).json({
        error: errorPerfil.message,
        codigo: errorPerfil.codigo,
        camposFaltantes: errorPerfil.camposFaltantes
      });
    }

    const items = await CarritoRepository.obtenerCarritoUsuario(usuarioId);

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Carrito vacío' });
    }

    const productos = [];
    for (const item of items) {
      const producto = await ProductosRepository.obtenerPorId(item.productoId);
      if (!producto || producto.stock < item.cantidad) {
        return res.status(400).json({ error: `Stock insuficiente para ${item.nombre}` });
      }
      productos.push({
        productoId: item.productoId,
        nombre: item.nombre || producto.nombre,
        cantidad: item.cantidad,
        precio: item.precioUnitario ?? producto.precio,
        imagen: producto.imagen || item.imagen || ''
      });
    }

    const totalRealBs = calcularTotal(items);
    const totalUsd = (totalRealBs / PAYPAL_USD_RATE).toFixed(2);

    if (!Number.isFinite(totalRealBs) || totalRealBs <= 0 || Number(totalUsd) <= 0) {
      return res.status(400).json({ error: 'Total inválido' });
    }

    const ordenPaypal = await PayPalService.crearOrdenPayPal(totalUsd);
    if (!ordenPaypal.id) {
      return res.status(500).json({ error: 'Error al crear orden en PayPal', detalle: ordenPaypal });
    }

    // Guardar una foto exacta del carrito antes de abrir PayPal.
    const ordenLocal = new Orden(
      usuarioId,
      productos,
      totalRealBs,
      obtenerDireccionEnvio(usuario),
      'paypal'
    );
    ordenLocal.paypalOrderId = ordenPaypal.id;
    ordenLocal.estado = 'pago_pendiente';
    ordenLocal.estadoPago = 'pendiente';
    await OrdenesRepository.crearOrden(ordenLocal);

    res.json({ id: ordenPaypal.id });
  } catch (error) {
    console.error('Error crear-orden PayPal:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/paypal/capturar-orden
router.post('/capturar-orden', authMiddleware, async (req, res) => {
  try {
    const { paypalOrderId } = req.body;
    const usuarioId = req.usuario.id;

    if (!paypalOrderId) {
      return res.status(400).json({ success: false, error: 'paypalOrderId requerido' });
    }

    const orden = await OrdenesRepository.obtenerPorPaypalOrderId(paypalOrderId, usuarioId);
    if (!orden) {
      return res.status(404).json({ success: false, error: 'Orden local de PayPal no encontrada' });
    }

    if (orden.estado !== 'pago_pendiente') {
      return res.json({ success: true, ordenId: orden.id });
    }

    const UserRepository = require('../repositories/userRepository');
    const usuario = await UserRepository.obtenerPorId(usuarioId);
    const errorPerfil = crearErrorPerfilIncompleto(usuario);
    if (errorPerfil) {
      return res.status(400).json({
        success: false,
        error: errorPerfil.message,
        codigo: errorPerfil.codigo,
        camposFaltantes: errorPerfil.camposFaltantes
      });
    }

    const captura = await PayPalService.capturarOrdenPayPal(paypalOrderId);
    if (captura.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: `Pago rechazado por PayPal. Detalle: ${captura.status || 'PAYMENT_DENIED'}`
      });
    }

    const montoCapturado = captura.purchase_units?.[0]?.payments?.captures?.[0]?.amount;
    const totalEsperadoUsd = (Number(orden.total) / PAYPAL_USD_RATE).toFixed(2);
    if (
      !montoCapturado ||
      montoCapturado.currency_code !== 'USD' ||
      Number(montoCapturado.value).toFixed(2) !== totalEsperadoUsd
    ) {
      return res.status(400).json({ success: false, error: 'El monto capturado no coincide con la orden' });
    }

    const productos = orden.productos || [];
    for (const item of productos) {
      const producto = await ProductosRepository.obtenerPorId(item.productoId);
      if (!producto || producto.stock < item.cantidad) {
        return res.status(409).json({ success: false, error: `Stock insuficiente para ${item.nombre}` });
      }
    }

    const descontados = [];
    try {
      for (const item of productos) {
        const descontado = await ProductosRepository.descontarStock(item.productoId, item.cantidad);
        if (!descontado) {
          throw new Error(`No se pudo reservar stock para ${item.nombre}`);
        }
        descontados.push(item);
      }
    } catch (error) {
      for (const item of descontados) {
        await ProductosRepository.actualizarStock(item.productoId, item.cantidad);
      }
      return res.status(409).json({ success: false, error: error.message });
    }

    await OrdenesRepository.actualizarEstado(orden.id, 'confirmada');
    await OrdenesRepository.actualizarEstadoPago(orden.id, 'pagado');
    await OrdenesRepository.registrarHistorial({
      ordenId: orden.id,
      estadoAnterior: 'pago_pendiente',
      estadoNuevo: 'confirmada',
      actorUsuarioId: usuarioId,
      actorRol: 'cliente',
      nota: 'Pago PayPal capturado'
    });
    await NotificacionesRepository.crear({
      usuarioId,
      ordenId: orden.id,
      tipo: 'orden_confirmada',
      mensaje: `Orden #${orden.id}: tu pago fue aprobado y estamos preparando tu pedido.`,
      enlace: 'profile.html?tab=ordenes'
    });
    await CarritoRepository.eliminarProductos(usuarioId, productos.map(item => item.productoId));

    // Generar factura PDF en segundo plano (no bloquea la respuesta).
    try {
      const { generarFacturaPDF } = require('../services/facturaService');
      const path = require('path');
      const fs = require('fs');
      const ordenCreada = await OrdenesRepository.obtenerPorId(orden.id);
      const usuarioData = {
        nombre: usuario?.nombre || 'Cliente',
        email: usuario?.email || 'N/A',
        telefono: usuario?.telefono || 'N/A',
        direccion: usuario?.direccion || '',
        ciudad: usuario?.ciudad || ''
      };
      const logoPath = path.join(__dirname, '../../../frontend/images/logo.png');
      generarFacturaPDF({
        orden: { ...ordenCreada, id: orden.id, fecha: ordenCreada.fechaPago || ordenCreada.fechaCreacion },
        usuario: usuarioData,
        productos,
        metodoPago: 'PayPal',
        logoPath: fs.existsSync(logoPath) ? logoPath : null
      }).catch(e => console.error('Error generando factura PayPal:', e));
    } catch (error) {
      console.error('Error iniciando generación de factura:', error);
    }

    res.json({ success: true, ordenId: orden.id });
  } catch (error) {
    console.error('Error capturar-orden PayPal:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
