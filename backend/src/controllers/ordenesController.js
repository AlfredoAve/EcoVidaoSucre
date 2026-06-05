const express = require('express');
const fs = require('fs');
const path = require('path');
const OrdenesRepository = require('../repositories/ordenesRepository');
const ProductosRepository = require('../repositories/productosRepository');
const NotificacionesRepository = require('../repositories/notificacionesRepository');
const CheckoutService = require('../services/checkoutService');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

const TRANSICIONES_ADMIN = {
  pendiente: ['confirmada', 'cancelada'],
  confirmada: ['enviado', 'cancelada'],
  entregado: ['completada']
};

const MENSAJES_ESTADO = {
  confirmada: 'Tu orden fue confirmada y está siendo preparada.',
  enviado: 'Tu pedido está en camino. Por favor, confirma la recepción cuando lo tengas.',
  entregado: 'Confirmaste la recepción de tu pedido.',
  completada: 'Tu orden fue completada.',
  cancelada: 'Tu orden fue cancelada.'
};

function sumarDiasHabiles(fecha, cantidad) {
  const resultado = new Date(fecha);
  let agregados = 0;
  while (agregados < cantidad) {
    resultado.setDate(resultado.getDate() + 1);
    const dia = resultado.getDay();
    if (dia !== 0 && dia !== 6) agregados++;
  }
  return resultado;
}

async function notificarEstado(orden, estado) {
  const mensaje = MENSAJES_ESTADO[estado];
  if (!mensaje) return;
  await NotificacionesRepository.crear({
    usuarioId: orden.usuarioId,
    ordenId: orden.id,
    tipo: `orden_${estado}`,
    mensaje: `Orden #${orden.id}: ${mensaje}`,
    enlace: 'profile.html?tab=ordenes'
  });
}

// GET /api/ordenes - Historial de órdenes del usuario
router.get('/', authMiddleware, async (req, res) => {
  try {
    const ordenes = await OrdenesRepository.obtenerPorUsuario(req.usuario.id);
    res.json(ordenes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ordenes/admin/todas - Obtener todas las órdenes (solo admin)
router.get('/admin/todas', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const ordenes = await OrdenesRepository.obtenerTodas();
    res.json(ordenes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ordenes/admin/estadisticas - Estadísticas (solo admin)
router.get('/admin/estadisticas', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const estadisticas = await OrdenesRepository.obtenerEstadisticas();
    res.json(estadisticas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/ordenes/admin/:id - Eliminar definitivamente una orden para limpieza
router.delete('/admin/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const orden = await OrdenesRepository.obtenerPorId(req.params.id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    if (orden.estado === 'enviado') {
      return res.status(400).json({
        error: 'No se puede eliminar una orden enviada. Primero confirma recepción, completa o cancela el flujo.'
      });
    }

    if (['pendiente', 'confirmada'].includes(orden.estado)) {
      for (const producto of orden.productos || []) {
        await ProductosRepository.actualizarStock(producto.productoId, Number(producto.cantidad) || 0);
      }
    }

    const eliminado = await OrdenesRepository.eliminarDefinitivamente(orden.id);
    if (!eliminado) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const facturasDir = path.resolve(__dirname, '../../facturas');
    const facturaPath = path.resolve(facturasDir, `F-${String(orden.id).padStart(6, '0')}.pdf`);
    if (facturaPath.startsWith(facturasDir) && fs.existsSync(facturaPath)) {
      fs.unlinkSync(facturaPath);
    }

    res.json({ exito: true, mensaje: 'Orden eliminada definitivamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ordenes/:id - Obtener detalle de una orden
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const orden = await OrdenesRepository.obtenerPorId(req.params.id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    if (req.usuario.id !== orden.usuarioId && req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para ver esta orden' });
    }
    const historial = await OrdenesRepository.obtenerHistorial(orden.id);
    res.json({ ...orden, historial });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ordenes/:id/factura - Descargar PDF de factura
router.get('/:id/factura', authMiddleware, async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  try {
    const orden = await OrdenesRepository.obtenerPorId(req.params.id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    if (req.usuario.id !== orden.usuarioId && req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para descargar esta factura' });
    }

    const facturaId = `F-${orden.id.toString().padStart(6, '0')}`;
    const facturasDir = path.join(__dirname, '../../facturas');
    if (!fs.existsSync(facturasDir)) fs.mkdirSync(facturasDir, { recursive: true });
    const pdfPath = path.join(facturasDir, `${facturaId}.pdf`);

    const { generarFacturaPDF } = require('../services/facturaService');
    const UserRepository = require('../repositories/userRepository');
    const usuarioRaw = await UserRepository.obtenerPorId(orden.usuarioId);
    const usuario = {
      nombre: usuarioRaw.nombre || 'Cliente General',
      email: usuarioRaw.email || 'N/A',
      telefono: usuarioRaw.telefono || 'N/A',
      direccion: usuarioRaw.direccion || '',
      ciudad: usuarioRaw.ciudad || ''
    };
    const logoPath = path.join(__dirname, '../../../frontend/images/logo.png');

    await generarFacturaPDF({
      orden: { ...orden, id: orden.id, fecha: orden.fechaCreacion },
      usuario,
      productos: orden.productos || [],
      metodoPago: orden.metodoPago || 'No especificado',
      logoPath: fs.existsSync(logoPath) ? logoPath : null
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${facturaId}.pdf"`);
    fs.createReadStream(pdfPath).pipe(res);
  } catch (error) {
    console.error('Error generando factura:', error);
    res.status(500).json({ error: 'Error al generar la factura: ' + error.message });
  }
});

// POST /api/ordenes - Crear nueva orden desde carrito
router.post('/', authMiddleware, async (req, res) => {
  try {
    const direccionEnvio = String(req.body.direccionEnvio || '').trim();
    if (!direccionEnvio) {
      return res.status(400).json({ error: 'Dirección de envío requerida' });
    }
    const resultado = await CheckoutService.procesarPago(req.usuario.id, direccionEnvio);
    res.json(resultado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/ordenes/:id/estado - Actualizar estado (solo admin)
router.put('/:id/estado', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const estado = String(req.body.estado || '').trim();
    const numeroSeguimiento = String(req.body.numeroSeguimiento || '').trim();
    const estadosValidos = [
      'pendiente',
      'confirmada',
      'enviado',
      'entregado',
      'completada',
      'cancelada'
    ];

    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const orden = await OrdenesRepository.obtenerPorId(req.params.id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    if (orden.estado === estado) {
      return res.json({ exito: true, mensaje: 'La orden ya tiene ese estado' });
    }

    const permitidos = TRANSICIONES_ADMIN[orden.estado] || [];
    if (!permitidos.includes(estado)) {
      return res.status(400).json({
        error: `No se puede cambiar una orden de ${orden.estado} a ${estado}`
      });
    }
    if (estado === 'cancelada' && orden.metodoPago === 'paypal' && orden.estado === 'confirmada') {
      return res.status(400).json({
        error: 'Una orden PayPal pagada requiere reembolso antes de cancelarse'
      });
    }
    if (estado === 'enviado' && !numeroSeguimiento) {
      return res.status(400).json({
        error: 'Agrega una referencia o número de seguimiento antes de marcar la orden como enviada'
      });
    }

    if (estado === 'cancelada') {
      for (const producto of orden.productos || []) {
        await ProductosRepository.actualizarStock(producto.productoId, Number(producto.cantidad) || 0);
      }
    }
    if (estado === 'enviado') {
      await OrdenesRepository.actualizarSeguimiento(orden.id, numeroSeguimiento);
    }

    await OrdenesRepository.actualizarEstado(orden.id, estado);
    await OrdenesRepository.registrarHistorial({
      ordenId: orden.id,
      estadoAnterior: orden.estado,
      estadoNuevo: estado,
      actorUsuarioId: req.usuario.id,
      actorRol: req.usuario.rol,
      nota: estado === 'enviado' ? `Seguimiento: ${numeroSeguimiento}` : null
    });
    await notificarEstado(orden, estado);

    res.json({ exito: true, mensaje: 'Estado actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/ordenes/:id/confirmar-recepcion - Confirmación exclusiva del cliente
router.put('/:id/confirmar-recepcion', authMiddleware, async (req, res) => {
  try {
    const orden = await OrdenesRepository.obtenerPorId(req.params.id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    if (orden.usuarioId !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permiso para confirmar esta orden' });
    }
    if (orden.estado !== 'enviado') {
      return res.status(400).json({
        error: 'La recepción solo puede confirmarse cuando la orden está enviada'
      });
    }

    await OrdenesRepository.actualizarEstado(orden.id, 'entregado');
    if (orden.metodoPago === 'contraentrega') {
      await OrdenesRepository.actualizarEstadoPago(orden.id, 'pagado');
    }
    await OrdenesRepository.registrarHistorial({
      ordenId: orden.id,
      estadoAnterior: orden.estado,
      estadoNuevo: 'entregado',
      actorUsuarioId: req.usuario.id,
      actorRol: 'cliente',
      nota: orden.metodoPago === 'contraentrega'
        ? 'Recepción confirmada por el cliente y pago en efectivo registrado'
        : 'Recepción confirmada por el cliente'
    });
    await notificarEstado(orden, 'entregado');

    res.json({ exito: true, mensaje: 'Recepción confirmada. Gracias.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/ordenes/:id/seguimiento - Actualizar seguimiento (solo admin)
router.put('/:id/seguimiento', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const numeroSeguimiento = String(req.body.numeroSeguimiento || '').trim();
    if (!numeroSeguimiento) {
      return res.status(400).json({ error: 'Referencia o número de seguimiento requerido' });
    }

    const orden = await OrdenesRepository.obtenerPorId(req.params.id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    if (orden.estado !== 'enviado') {
      return res.status(400).json({
        error: 'El seguimiento solo puede actualizarse después de enviar la orden'
      });
    }

    await OrdenesRepository.actualizarSeguimiento(orden.id, numeroSeguimiento);
    await OrdenesRepository.registrarHistorial({
      ordenId: orden.id,
      estadoAnterior: orden.estado,
      estadoNuevo: orden.estado,
      actorUsuarioId: req.usuario.id,
      actorRol: req.usuario.rol,
      nota: `Seguimiento actualizado: ${numeroSeguimiento}`
    });
    await NotificacionesRepository.crear({
      usuarioId: orden.usuarioId,
      ordenId: orden.id,
      tipo: 'orden_seguimiento',
      mensaje: `Orden #${orden.id}: seguimiento actualizado: ${numeroSeguimiento}.`,
      enlace: 'profile.html?tab=ordenes'
    });

    res.json({ exito: true, mensaje: 'Seguimiento actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
