const express = require('express');
const CategoriaRepository = require('../repositories/categoriaRepository');
const Categoria = require('../models/Categoria');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

// GET /api/categorias - Listar categorías activas
router.get('/', async (req, res) => {
  try {
    const categorias = await CategoriaRepository.obtenerConProductos();
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/categorias - Crear categoría (solo admin)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { nombre, descripcion, imagen } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'Nombre requerido' });
    }

    const categoria = new Categoria(nombre, descripcion, imagen);
    const categoriaId = await CategoriaRepository.crearCategoria(categoria);

    res.json({ exito: true, id: categoriaId });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Esta categoría ya existe' });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/categorias - Listar todas las categorías (solo admin)
router.get('/admin/todas', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const categorias = await CategoriaRepository.obtenerTodos();
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/categorias/:id - Obtener categoría por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const categoria = await CategoriaRepository.obtenerPorId(id);

    if (!categoria) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json(categoria);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/categorias/:id - Actualizar categoría (solo admin)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, imagen, activa } = req.body;

    const datos = { nombre, descripcion, imagen, activa };
    Object.keys(datos).forEach((k) => {
      if (datos[k] === undefined) delete datos[k];
    });

    if (!Object.keys(datos).length) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const actualizado = await CategoriaRepository.actualizarCategoria(id, datos);

    if (!actualizado) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({ exito: true, mensaje: 'Categoría actualizada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/categorias/:id - Desactivar categoría (solo admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const desactivada = await CategoriaRepository.desactivarCategoria(id);

    if (!desactivada) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({ exito: true, mensaje: 'Categoría desactivada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
