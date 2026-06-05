const express = require('express');
const ProductosRepository = require('../repositories/productosRepository');
const Producto = require('../models/Producto');

const router = express.Router();

// GET /api/productos - Listar todos los productos
router.get('/', async (req, res) => {
  try {
    // [NUEVO] Parámetros para paginación y filtros
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const categoriaId = req.query.categoria || '';
    const buscar = req.query.buscar || '';
    const destacado = ['1', 'true'].includes(String(req.query.destacado).toLowerCase()) ? 1 : '';

    const resultado = await ProductosRepository.obtenerPaginado(page, limit, categoriaId, buscar, destacado);
    console.log(`📦 Productos encontrados: ${resultado.productos.length} (Total: ${resultado.total})`);
    
    // [NUEVO] Devolver objeto con metadatos de paginación
    res.json(resultado);
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
