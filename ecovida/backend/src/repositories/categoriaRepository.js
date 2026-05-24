const { getDB } = require('../config/database');

class CategoriaRepository {
  static crearCategoria(categoria) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      const query = `
        INSERT INTO categorias (nombre, descripcion, imagen)
        VALUES (?, ?, ?)
      `;
      db.run(query,
        [categoria.nombre, categoria.descripcion, categoria.imagen],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  static obtenerPorId(id) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.get('SELECT * FROM categorias WHERE id = ? AND activa = 1', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static obtenerTodas() {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all('SELECT * FROM categorias WHERE activa = 1 ORDER BY nombre',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  static obtenerTodos() {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all('SELECT * FROM categorias ORDER BY nombre',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  static actualizarCategoria(id, datos) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      const entries = Object.entries(datos).filter(([, v]) => v !== undefined);
      if (!entries.length) {
        resolve(false);
        return;
      }
      const campos = entries.map(([k]) => `${k} = ?`).join(', ');
      const valores = entries.map(([, v]) => v);
      const query = `UPDATE categorias SET ${campos} WHERE id = ?`;

      db.run(query, [...valores, id], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  static desactivarCategoria(id) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.run('UPDATE categorias SET activa = 0 WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  static obtenerConProductos() {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all(`
        SELECT c.id, c.nombre, c.descripcion, c.imagen, COUNT(p.id) as productosCount
        FROM categorias c
        LEFT JOIN productos p ON c.id = p.categoriaId AND p.activo = 1
        WHERE c.activa = 1
        GROUP BY c.id
        ORDER BY c.nombre
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
}

module.exports = CategoriaRepository;
