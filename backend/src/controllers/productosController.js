const express = require('express');
const ProductosRepository = require('../repositories/productosRepository');
const Producto = require('../models/Producto');

const router = express.Router();

// GET /api/productos - Listar todos los productos
router.get('/', async (req, res) => {
  try {
    const productos = await ProductosRepository.obtenerTodos();
    console.log('📦 Productos encontrados:', productos ? productos.length : 0);
    res.json(productos || []);
  } catch (error) {
    console.error('❌ Error obteniendo productos:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/productos/:id - Obtener producto por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await ProductosRepository.obtenerPorId(id);

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/productos/categoria/:id - Productos por categoría
router.get('/categoria/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const productos = await ProductosRepository.obtenerPorCategoria(id);
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/productos/buscar?q=termo - Buscar productos
router.get('/buscar/:termino', async (req, res) => {
  try {
    const { termino } = req.params;
    const productos = await ProductosRepository.buscar(termino);
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
