const { getDB } = require('../config/database');

class CarritoRepository {
  static agregarAlCarrito(usuarioId, productoId, cantidad, precioUnitario) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      const query = `
        INSERT OR REPLACE INTO carrito (usuarioId, productoId, cantidad, precioUnitario)
        VALUES (?, ?, ?, ?)
      `;
      db.run(query, [usuarioId, productoId, cantidad, precioUnitario], function(err) {
        if (err) reject(err);
        else resolve(this.lastID || 1);
      });
    });
  }

  static obtenerCarritoUsuario(usuarioId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all(`
        SELECT c.usuarioId, c.productoId, c.cantidad, c.precioUnitario,
               p.nombre, p.imagen, (c.cantidad * c.precioUnitario) as subtotal
        FROM carrito c
        JOIN productos p ON c.productoId = p.id
        WHERE c.usuarioId = ?
      `, [usuarioId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  static actualizarCantidad(usuarioId, productoId, cantidad) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      if (cantidad <= 0) {
        this.eliminarDelCarrito(usuarioId, productoId)
          .then(resolve)
          .catch(reject);
      } else {
        db.run('UPDATE carrito SET cantidad = ? WHERE usuarioId = ? AND productoId = ?',
          [cantidad, usuarioId, productoId], function(err) {
            if (err) reject(err);
            else resolve(this.changes > 0);
          }
        );
      }
    });
  }

  static eliminarDelCarrito(usuarioId, productoId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.run('DELETE FROM carrito WHERE usuarioId = ? AND productoId = ?',
        [usuarioId, productoId], function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  static vaciarCarrito(usuarioId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.run('DELETE FROM carrito WHERE usuarioId = ?', [usuarioId], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  static obtenerTotal(usuarioId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.get(`
        SELECT SUM(cantidad * precioUnitario) as total
        FROM carrito
        WHERE usuarioId = ?
      `, [usuarioId], (err, row) => {
        if (err) reject(err);
        else resolve(row?.total || 0);
      });
    });
  }

  static obtenerCantidadProductos(usuarioId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.get(`
        SELECT COUNT(*) as cantidad
        FROM carrito
        WHERE usuarioId = ?
      `, [usuarioId], (err, row) => {
        if (err) reject(err);
        else resolve(row?.cantidad || 0);
      });
    });
  }
}

module.exports = CarritoRepository;
