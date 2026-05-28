const express = require('express');
const { getDB } = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

// GET /api/contacto - Listar mensajes (solo admin)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  const db = getDB();
  db.all('SELECT * FROM contacto_mensajes ORDER BY fechaCreacion DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// POST /api/contacto
router.post('/', async (req, res) => {
  const { nombre, email, asunto, mensaje } = req.body;

  if (!nombre || !email || !asunto || !mensaje) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Email inválido.' });
  }

  const db = getDB();
  const query = `
    INSERT INTO contacto_mensajes (nombre, email, asunto, mensaje)
    VALUES (?, ?, ?, ?)
  `;

  db.run(query, [nombre.trim(), email.trim(), asunto.trim(), mensaje.trim()], function(err) {
    if (err) {
      console.error('Error guardando mensaje de contacto:', err);
      return res.status(500).json({ error: 'Error al guardar el mensaje.' });
    }
    res.json({ ok: true, id: this.lastID, mensaje: 'Mensaje recibido. Te responderemos pronto.' });
  });
});

module.exports = router;
