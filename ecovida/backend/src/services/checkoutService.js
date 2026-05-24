const mercadopago = require('mercadopago');
const OrdenesRepository = require('../repositories/ordenesRepository');
const CarritoRepository = require('../repositories/carritoRepository');
const ProductosRepository = require('../repositories/productosRepository');

// Configurar MercadoPago (será configurado con token en env)
const MERCADOPAGO_TOKEN = process.env.MERCADOPAGO_TOKEN || null;

class CheckoutService {
  static configurarMercadoPago(token) {
    if (token) {
      mercadopago.configure({
        access_token: token
      });
    }
  }

  static async crearOrdenDesdeCarrito(usuarioId, direccionEnvio) {
    // Obtener carrito del usuario
    const items = await CarritoRepository.obtenerCarritoUsuario(usuarioId);

    if (!items || items.length === 0) {
      throw new Error('El carrito está vacío');
    }

    // Validar stock disponible
    for (const item of items) {
      const producto = await ProductosRepository.obtenerPorId(item.productoId);
      if (!producto || producto.stock < item.cantidad) {
        throw new Error(`Stock insuficiente para ${item.nombre}`);
      }
    }

    // Calcular total
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    // Crear orden
    const Orden = require('../models/Orden');
    const productos = items.map(item => ({
      productoId: item.productoId,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precio: item.precioUnitario
    }));

    const orden = new Orden(usuarioId, productos, total, direccionEnvio);
    const ordenId = await OrdenesRepository.crearOrden(orden);

    // Descontar stock
    for (const item of items) {
      await ProductosRepository.actualizarStock(item.productoId, -item.cantidad);
    }

    // Vaciar carrito
    await CarritoRepository.vaciarCarrito(usuarioId);

    return {
      ordenId,
      total,
      productos
    };
  }

  static async crearPreferenciaMP(orden) {
    if (!MERCADOPAGO_TOKEN) {
      throw new Error('MercadoPago no configurado');
    }

    const preference = {
      items: orden.productos.map(prod => ({
        id: prod.productoId.toString(),
        title: prod.nombre,
        quantity: prod.cantidad,
        unit_price: prod.precio
      })),
      payer: {
        email: 'cliente@ecovida.com'
      },
      back_urls: {
        success: '/frontend/orden-confirmacion.html',
        failure: '/frontend/carrito.html',
        pending: '/frontend/carrito.html'
      },
      auto_return: 'approved',
      external_reference: `orden-${orden.ordenId}`
    };

    try {
      const response = await mercadopago.preferences.create(preference);
      return response.body.init_point;
    } catch (error) {
      throw new Error('Error al crear preferencia en MercadoPago: ' + error.message);
    }
  }

  static async confirmarPago(ordenId, detallesPago) {
    // Actualizar estado de orden
    await OrdenesRepository.actualizarEstado(ordenId, 'confirmada');

    if (detallesPago.numeroSeguimiento) {
      await OrdenesRepository.actualizarSeguimiento(ordenId, detallesPago.numeroSeguimiento);
    }

    return {
      exito: true,
      mensaje: 'Pago confirmado',
      ordenId
    };
  }

  static async procesarPago(usuarioId, direccionEnvio) {
    try {
      const ordenData = await this.crearOrdenDesdeCarrito(usuarioId, direccionEnvio);

      if (MERCADOPAGO_TOKEN) {
        const orden = await OrdenesRepository.obtenerPorId(ordenData.ordenId);
        const linkPago = await this.crearPreferenciaMP({
          ordenId: ordenData.ordenId,
          ...orden
        });
        return { ...ordenData, linkPago };
      }

      return ordenData;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CheckoutService;
