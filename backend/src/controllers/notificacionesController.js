const express = require('express');
const NotificacionesRepository = require('../repositories/notificacionesRepository');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const notificaciones = await NotificacionesRepository.obtenerPorUsuario(req.usuario.id);
    const noLeidas = await NotificacionesRepository.contarNoLeidas(req.usuario.id);
    res.json({ notificaciones, noLeidas });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/no-leidas', authMiddleware, async (req, res) => {
  try {
    const total = await NotificacionesRepository.contarNoLeidas(req.usuario.id);
    res.json({ total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/leer-todas', authMiddleware, async (req, res) => {
  try {
    await NotificacionesRepository.marcarTodasLeidas(req.usuario.id);
    res.json({ exito: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/leida', authMiddleware, async (req, res) => {
  try {
    const actualizada = await NotificacionesRepository.marcarLeida(req.params.id, req.usuario.id);
    if (!actualizada) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }
    res.json({ exito: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
