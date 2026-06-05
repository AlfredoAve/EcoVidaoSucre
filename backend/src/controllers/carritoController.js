const express = require('express');
const CarritoRepository = require('../repositories/carritoRepository');
const ProductosRepository = require('../repositories/productosRepository');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

// GET /api/carrito - Obtener carrito del usuario
router.get('/', async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const items = await CarritoRepository.obtenerCarritoUsuario(usuarioId);
    const total = await CarritoRepository.obtenerTotal(usuarioId);

    res.json({
      items,
      total,
      cantidad: items.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/carrito - Agregar producto al carrito
router.post('/', async (req, res) => {
  try {
    const productoId = Number(req.body.productoId);
    const cantidad = Number(req.body.cantidad);
    const usuarioId = req.usuario.id;

    if (!Number.isInteger(productoId) || !Number.isInteger(cantidad) || cantidad < 1) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    // Validar que el producto existe
    const producto = await ProductosRepository.obtenerPorId(productoId);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Calcular la cantidad total que habría en el carrito
    const carritoActual = await CarritoRepository.obtenerCarritoUsuario(usuarioId);
    const itemEnCarrito = carritoActual.find(item => item.productoId === productoId);
    const cantidadActual = itemEnCarrito ? itemEnCarrito.cantidad : 0;
    const cantidadTotal = cantidadActual + cantidad;

    if (producto.stock < cantidadTotal) {
      return res.status(400).json({ error: `Stock insuficiente. Ya tienes ${cantidadActual} en el carrito y el límite es ${producto.stock}.` });
    }

    // Agregar al carrito
    await CarritoRepository.agregarAlCarrito(usuarioId, productoId, cantidad, producto.precio);

    res.json({ exito: true, mensaje: 'Producto agregado al carrito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/carrito/:productoId - Actualizar cantidad
router.put('/:productoId', async (req, res) => {
  try {
    const cantidad = Number(req.body.cantidad);
    const productoId = Number(req.params.productoId);
    const usuarioId = req.usuario.id;

    if (!Number.isInteger(productoId) || !Number.isInteger(cantidad) || cantidad < 1) {
      return res.status(400).json({ error: 'Cantidad inválida' });
    }

    const producto = await ProductosRepository.obtenerPorId(productoId);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    if (cantidad > producto.stock) {
      return res.status(400).json({ error: `Stock insuficiente. El límite es ${producto.stock}.` });
    }

    const actualizado = await CarritoRepository.actualizarCantidad(
      usuarioId,
      productoId,
      cantidad
    );

    if (!actualizado) {
      return res.status(404).json({ error: 'Producto no encontrado en carrito' });
    }

    res.json({ exito: true, mensaje: 'Carrito actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/carrito/:productoId - Eliminar del carrito
router.delete('/:productoId', async (req, res) => {
  try {
    const { productoId } = req.params;
    const usuarioId = req.usuario.id;

    const eliminado = await CarritoRepository.eliminarDelCarrito(usuarioId, productoId);

    if (!eliminado) {
      return res.status(404).json({ error: 'Producto no encontrado en carrito' });
    }

    res.json({ exito: true, mensaje: 'Producto eliminado del carrito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/carrito - Vaciar carrito
router.delete('/', async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    await CarritoRepository.vaciarCarrito(usuarioId);
    res.json({ exito: true, mensaje: 'Carrito vaciado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
