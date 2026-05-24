const express = require('express');
const UserRepository = require('../repositories/userRepository');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

// GET /api/users/perfil - Obtener perfil del usuario logueado
router.get('/perfil', authMiddleware, async (req, res) => {
  try {
    const usuario = await UserRepository.obtenerPorId(req.usuario.id);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // No enviar contraseña
    delete usuario.contrasena;
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/users/perfil - Actualizar perfil del usuario
router.put('/perfil', authMiddleware, async (req, res) => {
  try {
    const { nombre, telefono, direccion, ciudad } = req.body;
    const usuarioId = req.usuario.id;

    const actualizado = await UserRepository.actualizarUsuario(usuarioId, {
      nombre,
      telefono,
      direccion,
      ciudad
    });

    if (!actualizado) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ exito: true, mensaje: 'Perfil actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users - Listar usuarios (solo admin)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const usuarios = await UserRepository.obtenerTodos();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/users/:id/desactivar - Desactivar usuario (solo admin)
router.put('/:id/desactivar', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const desactivado = await UserRepository.desactivarUsuario(id);

    if (!desactivado) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ exito: true, mensaje: 'Usuario desactivado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
