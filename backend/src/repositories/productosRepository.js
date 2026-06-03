const { getDB } = require('../config/database');

class ProductosRepository {
  static crearProducto(producto) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      const query = `
        INSERT INTO productos (nombre, descripcion, precio, stock, categoriaId, imagen)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      db.run(query,
        [producto.nombre, producto.descripcion, producto.precio, producto.stock,
         producto.categoriaId, producto.imagen],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // [NUEVO] Método para obtener productos paginados y filtrados
  static obtenerPaginado(page, limit, categoriaId, buscar) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      let query = 'SELECT * FROM productos WHERE activo = 1';
      let countQuery = 'SELECT COUNT(*) as total FROM productos WHERE activo = 1';
      const params = [];

      if (categoriaId) {
        query += ' AND categoriaId = ?';
        countQuery += ' AND categoriaId = ?';
        params.push(categoriaId);
      }

      if (buscar) {
        query += ' AND (nombre LIKE ? OR descripcion LIKE ?)';
        countQuery += ' AND (nombre LIKE ? OR descripcion LIKE ?)';
        params.push(`%${buscar}%`, `%${buscar}%`);
      }

      query += ' ORDER BY nombre LIMIT ? OFFSET ?';
      const offset = (page - 1) * limit;

      db.get(countQuery, params, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        const total = row.total;

        db.all(query, [...params, limit, offset], (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve({
            productos: rows || [],
            total,
            pagina: parseInt(page),
            totalPaginas: Math.ceil(total / limit)
          });
        });
      });
    });
  }

  static obtenerPorId(id) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.get('SELECT * FROM productos WHERE id = ? AND activo = 1', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static obtenerTodos() {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all('SELECT * FROM productos WHERE activo = 1 ORDER BY nombre', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  static obtenerPorCategoria(categoriaId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all('SELECT * FROM productos WHERE categoriaId = ? AND activo = 1',
        [categoriaId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  static buscar(termino) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      const query = `
        SELECT * FROM productos
        WHERE (nombre LIKE ? OR descripcion LIKE ?) AND activo = 1
        ORDER BY nombre
      `;
      db.all(query, [`%${termino}%`, `%${termino}%`], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  static actualizarProducto(id, datos) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      const entries = Object.entries(datos).filter(([, v]) => v !== undefined);
      if (!entries.length) {
        resolve(false);
        return;
      }
      const campos = entries.map(([k]) => `${k} = ?`).join(', ');
      const valores = entries.map(([, v]) => v);
      const query = `UPDATE productos SET ${campos} WHERE id = ?`;

      db.run(query, [...valores, id], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  static actualizarStock(id, cantidad) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.run('UPDATE productos SET stock = MAX(0, stock + ?) WHERE id = ?',
        [cantidad, id], function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  static desactivarProducto(id) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.run('UPDATE productos SET activo = 0 WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  static obtenerProductosAdmin() {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all(`
        SELECT p.*, c.nombre as categoriaNombre
        FROM productos p
        LEFT JOIN categorias c ON p.categoriaId = c.id
        ORDER BY p.nombre
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
}

module.exports = ProductosRepository;
