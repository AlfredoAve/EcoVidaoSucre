const express = require('express');
const ResenasRepository = require('../repositories/resenasRepository');
const Resena = require('../models/Resena');
const OrdenesRepository = require('../repositories/ordenesRepository');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/resenas/producto/:id - Reseñas de un producto
router.get('/producto/:productoId', async (req, res) => {
  try {
    const { productoId } = req.params;
    const resenas = await ResenasRepository.obtenerPorProducto(productoId);
    const promedio = await ResenasRepository.obtenerPromedio(productoId);

    res.json({
      resenas,
      promedio: promedio.promedio,
      total: promedio.total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/resenas - Reseñas del usuario logueado o todas si es admin
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.usuario.rol === 'admin') {
      const resenas = await ResenasRepository.obtenerTodas();
      return res.json(resenas);
    }

    const usuarioId = req.usuario.id;
    const resenas = await ResenasRepository.obtenerPorUsuario(usuarioId);
    res.json(resenas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/resenas/puede-resenar/:productoId
router.get('/puede-resenar/:productoId', authMiddleware, async (req, res) => {
  try {
    const puedeResenar = await OrdenesRepository.usuarioRecibioProducto(
      req.usuario.id,
      req.params.productoId
    );
    res.json({ puedeResenar });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/resenas - Crear reseña
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { productoId, calificacion, comentario } = req.body;
    const usuarioId = req.usuario.id;

    if (!productoId || !calificacion) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const recibioProducto = await OrdenesRepository.usuarioRecibioProducto(usuarioId, productoId);
    if (!recibioProducto) {
      return res.status(403).json({
        error: 'Solo puedes reseñar productos de pedidos cuya recepción confirmaste'
      });
    }

    // Validar calificación
    if (calificacion < 1 || calificacion > 5) {
      return res.status(400).json({ error: 'Calificación debe ser entre 1 y 5' });
    }

    // Verificar si ya existe reseña del usuario para este producto
    const existente = await ResenasRepository.obtenerResenaUsuarioProducto(usuarioId, productoId);
    if (existente) {
      return res.status(400).json({ error: 'Ya has reseñado este producto' });
    }

    const resena = new Resena(usuarioId, productoId, calificacion, comentario || '');

    if (!resena.esValida()) {
      return res.status(400).json({ error: 'Reseña inválida' });
    }

    const resenaId = await ResenasRepository.crearResena(resena);

    res.json({
      exito: true,
      mensaje: 'Reseña creada',
      id: resenaId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/resenas/:id - Actualizar reseña
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const calificacion = Number(req.body.calificacion);
    const comentario = req.body.comentario ?? '';
    const usuarioId = req.usuario.id;

    if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
      return res.status(400).json({ error: 'Calificación debe ser entre 1 y 5' });
    }

    // Verificar que la reseña pertenece al usuario
    const resena = await ResenasRepository.obtenerPorId(id);

    if (!resena) {
      return res.status(404).json({ error: 'Reseña no encontrada' });
    }

    if (resena.usuarioId !== usuarioId) {
      return res.status(403).json({ error: 'No tienes permiso para editar esta reseña' });
    }

    const actualizado = await ResenasRepository.actualizarResena(id, {
      calificacion,
      comentario
    });

    if (!actualizado) {
      return res.status(404).json({ error: 'Reseña no encontrada' });
    }

    res.json({ exito: true, mensaje: 'Reseña actualizada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/resenas/:id - Eliminar reseña
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario.id;

    const resena = await ResenasRepository.obtenerPorId(id);
    if (!resena) {
      return res.status(404).json({ error: 'Reseña no encontrada' });
    }

    if (resena.usuarioId !== usuarioId && req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta reseña' });
    }

    const eliminado = await ResenasRepository.eliminarResena(id);

    if (!eliminado) {
      return res.status(404).json({ error: 'Reseña no encontrada' });
    }

    res.json({ exito: true, mensaje: 'Reseña eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
