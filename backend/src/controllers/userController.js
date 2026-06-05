const express = require('express');
const fs = require('fs');
const path = require('path');
const UserRepository = require('../repositories/userRepository');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
  crearErrorPerfilIncompleto,
  normalizarDatosPerfil,
  validarPerfilCompleto
} = require('../utils/perfilValidation');

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
    const validacionPerfil = validarPerfilCompleto(usuario);
    usuario.perfilCompleto = validacionPerfil.completo;
    usuario.camposPerfilFaltantes = validacionPerfil.camposFaltantes;
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/users/perfil - Actualizar perfil del usuario
router.put('/perfil', authMiddleware, async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const datosPerfil = normalizarDatosPerfil(req.body);
    const errorPerfil = crearErrorPerfilIncompleto(datosPerfil);

    if (errorPerfil) {
      return res.status(400).json({
        error: errorPerfil.message,
        codigo: errorPerfil.codigo,
        camposFaltantes: errorPerfil.camposFaltantes
      });
    }

    const actualizado = await UserRepository.actualizarUsuario(usuarioId, datosPerfil);

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
    const usuario = await UserRepository.obtenerPorId(id);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (usuario.rol === 'admin') {
      return res.status(400).json({ error: 'No se puede desactivar una cuenta administradora' });
    }

    await UserRepository.desactivarUsuario(id);
    res.json({ exito: true, mensaje: 'Usuario desactivado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/users/:id/definitivo - Eliminar usuario sin historial de órdenes
router.delete('/:id/definitivo', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await UserRepository.obtenerPorId(id);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (Number(id) === Number(req.usuario.id)) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta desde el panel' });
    }
    if (usuario.rol === 'admin') {
      return res.status(400).json({ error: 'No se puede eliminar una cuenta administradora' });
    }
    if (usuario.activo === 1 || usuario.activo === true) {
      return res.status(400).json({ error: 'Desactiva el usuario antes de eliminarlo definitivamente' });
    }

    const ordenIds = await UserRepository.obtenerOrdenesIds(id);
    const eliminado = await UserRepository.eliminarDefinitivamente(id);
    if (!eliminado) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const facturasDir = path.resolve(__dirname, '../../facturas');
    ordenIds.forEach((ordenId) => {
      const facturaPath = path.resolve(facturasDir, `F-${String(ordenId).padStart(6, '0')}.pdf`);
      if (facturaPath.startsWith(facturasDir) && fs.existsSync(facturaPath)) {
        fs.unlinkSync(facturaPath);
      }
    });

    res.json({ exito: true, mensaje: 'Usuario eliminado definitivamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
