const { getDB } = require('../config/database');

class NotificacionesRepository {
  static crear({ usuarioId, ordenId = null, tipo, mensaje, enlace = null }) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.run(`
        INSERT INTO notificaciones (usuarioId, ordenId, tipo, mensaje, enlace)
        VALUES (?, ?, ?, ?, ?)
      `, [usuarioId, ordenId, tipo, mensaje, enlace], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  static obtenerPorUsuario(usuarioId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all(`
        SELECT *
        FROM notificaciones
        WHERE usuarioId = ?
        ORDER BY fechaCreacion DESC
        LIMIT 100
      `, [usuarioId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  static contarNoLeidas(usuarioId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.get(`
        SELECT COUNT(*) AS total
        FROM notificaciones
        WHERE usuarioId = ? AND leida = 0
      `, [usuarioId], (err, row) => {
        if (err) reject(err);
        else resolve(Number(row?.total) || 0);
      });
    });
  }

  static marcarLeida(id, usuarioId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.run(`
        UPDATE notificaciones
        SET leida = 1
        WHERE id = ? AND usuarioId = ?
      `, [id, usuarioId], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  static marcarTodasLeidas(usuarioId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.run(`
        UPDATE notificaciones
        SET leida = 1
        WHERE usuarioId = ? AND leida = 0
      `, [usuarioId], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  static eliminar(id, usuarioId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.run(`
        DELETE FROM notificaciones
        WHERE id = ? AND usuarioId = ?
      `, [id, usuarioId], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  static eliminarTodas(usuarioId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.run(`
        DELETE FROM notificaciones
        WHERE usuarioId = ?
      `, [usuarioId], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }
}

module.exports = NotificacionesRepository;
