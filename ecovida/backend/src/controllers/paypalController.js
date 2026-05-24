const express = require('express');
const router = express.Router();
const PayPalService = require('../services/paypalService');
const OrdenesRepository = require('../repositories/ordenesRepository');
const CarritoRepository = require('../repositories/carritoRepository');
const ProductosRepository = require('../repositories/productosRepository');
const Orden = require('../models/Orden');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/paypal/crear-orden
router.post('/crear-orden', authMiddleware, async (req, res) => {
  try {
    const { total } = req.body;

    if (!total || parseFloat(total) <= 0) {
      return res.status(400).json({ error: 'Total inválido' });
    }

    const orden = await PayPalService.crearOrdenPayPal(total);

    if (orden.id) {
      return res.json({ id: orden.id });
    }

    res.status(500).json({ error: 'Error al crear orden en PayPal', detalle: orden });
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

    const captura = await PayPalService.capturarOrdenPayPal(paypalOrderId);

    if (captura.status !== 'COMPLETED') {
      return res.json({ success: false, error: `Pago no completado. Estado: ${captura.status}` });
    }

    const items = await CarritoRepository.obtenerCarritoUsuario(usuarioId);
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Carrito vacío' });
    }

    const totalReal = items.reduce((sum, item) => sum + item.subtotal, 0);

    const shipping = captura.purchase_units?.[0]?.shipping?.address;
    const direccionEnvio = shipping
      ? [shipping.address_line_1, shipping.admin_area_2, shipping.country_code].filter(Boolean).join(', ')
      : 'Dirección PayPal sandbox';

    const productos = items.map(item => ({
      productoId: item.productoId,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precio: item.precioUnitario
    }));

    const orden = new Orden(usuarioId, productos, totalReal, direccionEnvio, 'paypal');
    orden.paypalOrderId = paypalOrderId;
    orden.estado = 'confirmada';

    const ordenId = await OrdenesRepository.crearOrden(orden);

    for (const item of items) {
      await ProductosRepository.actualizarStock(item.productoId, -item.cantidad);
    }

    await CarritoRepository.vaciarCarrito(usuarioId);

    res.json({ success: true, ordenId });
  } catch (error) {
    console.error('Error capturar-orden PayPal:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
