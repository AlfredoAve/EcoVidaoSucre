const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const FavoritosRepository = require('../repositories/favoritosRepository');
const ProductosRepository = require('../repositories/productosRepository');

const router = express.Router();

// GET /api/favoritos - listar favoritos del usuario
router.get('/', authMiddleware, async (req, res) => {
  try {
    const favoritos = await FavoritosRepository.obtenerFavoritos(req.usuario.id);
    res.json(favoritos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/favoritos/ids - ids de favoritos
router.get('/ids', authMiddleware, async (req, res) => {
  try {
    const ids = await FavoritosRepository.obtenerIds(req.usuario.id);
    res.json(ids);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/favoritos - agregar favorito
router.post('/', authMiddleware, async (req, res) => {
  try {
    const productoId = Number(req.body.productoId);

    if (!productoId) {
      return res.status(400).json({ error: 'productoId requerido' });
    }

    const producto = await ProductosRepository.obtenerPorId(productoId);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const agregado = await FavoritosRepository.agregar(req.usuario.id, productoId);
    res.json({ exito: true, agregado });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/favoritos/:productoId - eliminar favorito
router.delete('/:productoId', authMiddleware, async (req, res) => {
  try {
    const productoId = Number(req.params.productoId);

    if (!productoId) {
      return res.status(400).json({ error: 'productoId inválido' });
    }

    const eliminado = await FavoritosRepository.eliminar(req.usuario.id, productoId);
    res.json({ exito: true, eliminado });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
