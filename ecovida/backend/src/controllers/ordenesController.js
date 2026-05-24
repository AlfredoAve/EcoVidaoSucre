const express = require('express');
const OrdenesRepository = require('../repositories/ordenesRepository');
const CheckoutService = require('../services/checkoutService');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

// GET /api/ordenes - Historial de órdenes del usuario
router.get('/', authMiddleware, async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const ordenes = await OrdenesRepository.obtenerPorUsuario(usuarioId);
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

// GET /api/ordenes/:id - Obtener detalle de una orden
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const orden = await OrdenesRepository.obtenerPorId(id);

    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    // Validar que el usuario es el propietario o es admin
    if (req.usuario.id !== orden.usuarioId && req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para ver esta orden' });
    }

    res.json(orden);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ordenes - Crear nueva orden desde carrito
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { direccionEnvio } = req.body;
    const usuarioId = req.usuario.id;

    if (!direccionEnvio) {
      return res.status(400).json({ error: 'Dirección de envío requerida' });
    }

    const resultado = await CheckoutService.procesarPago(usuarioId, direccionEnvio);
    res.json(resultado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/ordenes/:id/estado - Actualizar estado (solo admin)
router.put('/:id/estado', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosValidos = ['pendiente', 'confirmada', 'enviado', 'entregado', 'completada', 'cancelada'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const actualizado = await OrdenesRepository.actualizarEstado(id, estado);

    if (!actualizado) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    res.json({ exito: true, mensaje: 'Estado actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/ordenes/:id/seguimiento - Actualizar número de seguimiento (solo admin)
router.put('/:id/seguimiento', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { numeroSeguimiento } = req.body;

    if (!numeroSeguimiento) {
      return res.status(400).json({ error: 'Número de seguimiento requerido' });
    }

    const actualizado = await OrdenesRepository.actualizarSeguimiento(id, numeroSeguimiento);

    if (!actualizado) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    res.json({ exito: true, mensaje: 'Seguimiento actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
