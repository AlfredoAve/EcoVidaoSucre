const { getDB } = require('../config/database');

class ResenasRepository {
  static crearResena(resena) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      const query = `
        INSERT INTO resenas (usuarioId, productoId, calificacion, comentario)
        VALUES (?, ?, ?, ?)
      `;
      db.run(query,
        [resena.usuarioId, resena.productoId, resena.calificacion, resena.comentario],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  static obtenerPorProducto(productoId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all(`
        SELECT r.*, u.nombre
        FROM resenas r
        JOIN usuarios u ON r.usuarioId = u.id
        WHERE r.productoId = ?
        ORDER BY r.fechaCreacion DESC
      `, [productoId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  static obtenerPorUsuario(usuarioId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all(`
        SELECT r.*, p.nombre
        FROM resenas r
        JOIN productos p ON r.productoId = p.id
        WHERE r.usuarioId = ?
        ORDER BY r.fechaCreacion DESC
      `, [usuarioId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  static obtenerTodas() {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all(`
        SELECT r.*, p.nombre as productoNombre, u.nombre as usuarioNombre
        FROM resenas r
        JOIN productos p ON r.productoId = p.id
        JOIN usuarios u ON r.usuarioId = u.id
        ORDER BY r.fechaCreacion DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  static obtenerPromedio(productoId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.get(`
        SELECT
          ROUND(AVG(calificacion), 1) as promedio,
          COUNT(*) as total
        FROM resenas
        WHERE productoId = ?
      `, [productoId], (err, row) => {
        if (err) reject(err);
        else resolve({
          promedio: row?.promedio || 0,
          total: row?.total || 0
        });
      });
    });
  }

  static obtenerPorId(id) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.get('SELECT * FROM resenas WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static obtenerResenaUsuarioProducto(usuarioId, productoId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.get(`
        SELECT * FROM resenas
        WHERE usuarioId = ? AND productoId = ?
      `, [usuarioId, productoId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static actualizarResena(id, datos) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      const campos = Object.keys(datos).map(k => `${k} = ?`).join(', ');
      const valores = Object.values(datos);
      const query = `UPDATE resenas SET ${campos} WHERE id = ?`;

      db.run(query, [...valores, id], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  static eliminarResena(id) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.run('DELETE FROM resenas WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }
}

module.exports = ResenasRepository;
