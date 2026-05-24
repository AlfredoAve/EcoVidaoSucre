const { getDB } = require('../config/database');

class FavoritosRepository {
  static agregar(usuarioId, productoId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      const query = `
        INSERT OR IGNORE INTO favoritos (usuarioId, productoId)
        VALUES (?, ?)
      `;
      db.run(query, [usuarioId, productoId], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  static eliminar(usuarioId, productoId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.run(
        'DELETE FROM favoritos WHERE usuarioId = ? AND productoId = ?',
        [usuarioId, productoId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  static obtenerIds(usuarioId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all(
        'SELECT productoId FROM favoritos WHERE usuarioId = ?',
        [usuarioId],
        (err, rows) => {
          if (err) reject(err);
          else resolve((rows || []).map((r) => r.productoId));
        }
      );
    });
  }

  static obtenerFavoritos(usuarioId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all(
        `
        SELECT p.*, c.nombre as categoriaNombre, f.fechaAgregado
        FROM favoritos f
        JOIN productos p ON p.id = f.productoId AND p.activo = 1
        LEFT JOIN categorias c ON c.id = p.categoriaId
        WHERE f.usuarioId = ?
        ORDER BY f.fechaAgregado DESC
        `,
        [usuarioId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }
}

module.exports = FavoritosRepository;
