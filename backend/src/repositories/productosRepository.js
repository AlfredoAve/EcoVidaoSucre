const { getDB } = require('../config/database');

class ProductosRepository {
  static parsearBeneficios(producto) {
    if (!producto) return producto;
    try {
      producto.beneficios = JSON.parse(producto.beneficiosJSON || '[]');
    } catch {
      producto.beneficios = [];
    }
    delete producto.beneficiosJSON;
    return producto;
  }

  static crearProducto(producto) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      const query = `
        INSERT INTO productos (nombre, descripcion, precio, stock, categoriaId, imagen, destacado, beneficiosJSON)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.run(query,
        [producto.nombre, producto.descripcion, producto.precio, producto.stock,
         producto.categoriaId, producto.imagen, producto.destacado ? 1 : 0,
         JSON.stringify(producto.beneficios || [])],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // [NUEVO] Método para obtener productos paginados y filtrados
  static obtenerPaginado(page, limit, categoriaId, buscar, destacado = '') {
    return new Promise((resolve, reject) => {
      const db = getDB();
      let query = `
        SELECT p.*, c.nombre AS categoriaNombre,
               COALESCE(r.promedioResenas, 0) AS promedioResenas,
               COALESCE(r.totalResenas, 0) AS totalResenas
        FROM productos p
        LEFT JOIN categorias c ON p.categoriaId = c.id
        LEFT JOIN (
          SELECT productoId,
                 ROUND(AVG(calificacion), 1) AS promedioResenas,
                 COUNT(*) AS totalResenas
          FROM resenas
          GROUP BY productoId
        ) r ON p.id = r.productoId
        WHERE p.activo = 1
      `;
      let countQuery = 'SELECT COUNT(*) as total FROM productos p WHERE p.activo = 1';
      const params = [];

      if (categoriaId) {
        query += ' AND p.categoriaId = ?';
        countQuery += ' AND p.categoriaId = ?';
        params.push(categoriaId);
      }

      if (buscar) {
        query += ' AND (p.nombre LIKE ? OR p.descripcion LIKE ?)';
        countQuery += ' AND (p.nombre LIKE ? OR p.descripcion LIKE ?)';
        params.push(`%${buscar}%`, `%${buscar}%`);
      }

      if (destacado !== '') {
        query += ' AND p.destacado = ?';
        countQuery += ' AND p.destacado = ?';
        params.push(destacado);
      }

      query += ' ORDER BY p.nombre LIMIT ? OFFSET ?';
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
            productos: (rows || []).map(producto => this.parsearBeneficios(producto)),
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
      db.get(`
        SELECT p.*, c.nombre AS categoriaNombre,
               COALESCE(r.promedioResenas, 0) AS promedioResenas,
               COALESCE(r.totalResenas, 0) AS totalResenas
        FROM productos p
        LEFT JOIN categorias c ON p.categoriaId = c.id
        LEFT JOIN (
          SELECT productoId,
                 ROUND(AVG(calificacion), 1) AS promedioResenas,
                 COUNT(*) AS totalResenas
          FROM resenas
          GROUP BY productoId
        ) r ON p.id = r.productoId
        WHERE p.id = ? AND p.activo = 1
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(this.parsearBeneficios(row));
      });
    });
  }

  static obtenerTodos() {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all('SELECT * FROM productos WHERE activo = 1 ORDER BY nombre', (err, rows) => {
        if (err) reject(err);
        else resolve((rows || []).map(producto => this.parsearBeneficios(producto)));
      });
    });
  }

  static obtenerPorCategoria(categoriaId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all('SELECT * FROM productos WHERE categoriaId = ? AND activo = 1',
        [categoriaId], (err, rows) => {
          if (err) reject(err);
          else resolve((rows || []).map(producto => this.parsearBeneficios(producto)));
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
        else resolve((rows || []).map(producto => this.parsearBeneficios(producto)));
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

  static descontarStock(id, cantidad) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.run(
        'UPDATE productos SET stock = stock - ? WHERE id = ? AND activo = 1 AND stock >= ?',
        [cantidad, id, cantidad],
        function(err) {
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

  static obtenerPorIdAdmin(id) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.get('SELECT * FROM productos WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(this.parsearBeneficios(row));
      });
    });
  }

  static eliminarDefinitivamente(id) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.serialize(() => {
        db.run('DELETE FROM carrito WHERE productoId = ?', [id], (cartErr) => {
          if (cartErr) { reject(cartErr); return; }
          db.run('DELETE FROM favoritos WHERE productoId = ?', [id], (favErr) => {
            if (favErr) { reject(favErr); return; }
            db.run('DELETE FROM resenas WHERE productoId = ?', [id], (resenaErr) => {
              if (resenaErr) { reject(resenaErr); return; }
              db.run('DELETE FROM productos WHERE id = ?', [id], function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
              });
            });
          });
        });
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
        else resolve((rows || []).map(producto => this.parsearBeneficios(producto)));
      });
    });
  }
}

module.exports = ProductosRepository;
