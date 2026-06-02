const { getDB } = require('../config/database');

class OrdenesRepository {
  static crearOrden(orden) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      const query = `
        INSERT INTO ordenes (usuarioId, productosJSON, total, estado, direccionEnvio, metodoPago, paypalOrderId)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      db.run(query,
        [orden.usuarioId, JSON.stringify(orden.productos), orden.total,
         orden.estado, orden.direccionEnvio, orden.metodoPago,
         orden.paypalOrderId || null],
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
      db.get(`
        SELECT o.*, u.nombre, u.email, u.telefono, u.direccion AS direccionPerfil, u.ciudad
        FROM ordenes o
        JOIN usuarios u ON o.usuarioId = u.id
        WHERE o.id = ?
      `, [id], (err, row) => {
        if (err) reject(err);
        else {
          if (row) {
            row.productos = JSON.parse(row.productosJSON);
            delete row.productosJSON;
          }
          resolve(row);
        }
      });
    });
  }

  static obtenerPorUsuario(usuarioId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all('SELECT * FROM ordenes WHERE usuarioId = ? ORDER BY fechaCreacion DESC',
        [usuarioId], (err, rows) => {
          if (err) reject(err);
          else {
            rows = rows || [];
            rows = rows.map(row => {
              row.productos = JSON.parse(row.productosJSON);
              delete row.productosJSON;
              return row;
            });
            resolve(rows);
          }
        }
      );
    });
  }

  static obtenerTodas() {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all(`
        SELECT o.*, u.nombre, u.email, u.telefono, u.direccion, u.ciudad
        FROM ordenes o
        JOIN usuarios u ON o.usuarioId = u.id
        ORDER BY o.fechaCreacion DESC
      `, (err, rows) => {
        if (err) reject(err);
        else {
          rows = rows || [];
          rows = rows.map(row => {
            row.productos = JSON.parse(row.productosJSON);
            delete row.productosJSON;
            return row;
          });
          resolve(rows);
        }
      });
    });
  }

  static actualizarEstado(id, nuevoEstado) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      const query = `
        UPDATE ordenes
        SET estado = ?, fechaCompletada = ?
        WHERE id = ?
      `;
      const fechaCompletada = nuevoEstado === 'completada' ? new Date().toISOString() : null;
      db.run(query, [nuevoEstado, fechaCompletada, id], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  static actualizarSeguimiento(id, numeroSeguimiento) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.run('UPDATE ordenes SET numeroSeguimiento = ? WHERE id = ?',
        [numeroSeguimiento, id], function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  static obtenerPorEstado(estado) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all('SELECT * FROM ordenes WHERE estado = ? ORDER BY fechaCreacion DESC',
        [estado], (err, rows) => {
          if (err) reject(err);
          else {
            rows = rows || [];
            rows = rows.map(row => {
              row.productos = JSON.parse(row.productosJSON);
              delete row.productosJSON;
              return row;
            });
            resolve(rows);
          }
        }
      );
    });
  }

  static obtenerEstadisticas() {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.get(`
        SELECT
          COUNT(*) as totalOrdenes,
          SUM(total) as ingresoTotal,
          COUNT(CASE WHEN estado = 'completada' THEN 1 END) as completadas,
          COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes
        FROM ordenes
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row || {});
      });
    });
  }
}

module.exports = OrdenesRepository;
