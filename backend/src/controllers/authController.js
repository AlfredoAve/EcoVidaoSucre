const express = require('express');
const AuthService = require('../services/authService');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { nombre, email, contrasena } = req.body;

    if (!nombre || !email || !contrasena) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const usuario = await AuthService.registrarUsuario(nombre, email, contrasena, 'cliente');
    res.json({ exito: true, usuario });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, contrasena } = req.body;

    if (!email || !contrasena) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const resultado = await AuthService.loginUsuario(email, contrasena);
    res.json(resultado);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  // En JWT, el logout se maneja en el cliente eliminando el token
  res.json({ exito: true, mensaje: 'Sesión cerrada' });
});

module.exports = router;
