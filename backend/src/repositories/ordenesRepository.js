const { getDB } = require('../config/database');

class OrdenesRepository {
  static crearOrden(orden) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      const query = `
        INSERT INTO ordenes (usuarioId, productosJSON, total, estado, estadoPago, direccionEnvio, metodoPago, fechaPago, paypalOrderId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.run(query,
        [orden.usuarioId, JSON.stringify(orden.productos), orden.total,
         orden.estado, orden.estadoPago || 'pendiente', orden.direccionEnvio, orden.metodoPago,
         orden.fechaPago || null,
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

  static obtenerPorPaypalOrderId(paypalOrderId, usuarioId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.get(`
        SELECT *
        FROM ordenes
        WHERE paypalOrderId = ? AND usuarioId = ?
        ORDER BY id DESC
        LIMIT 1
      `, [paypalOrderId, usuarioId], (err, row) => {
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
      db.all("SELECT * FROM ordenes WHERE usuarioId = ? AND estado != 'pago_pendiente' ORDER BY fechaCreacion DESC",
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
        WHERE o.estado != 'pago_pendiente'
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
      const columnasFecha = {
        confirmada: 'fechaConfirmada',
        enviado: 'fechaEnviada',
        entrega_reportada: 'fechaEntregaReportada',
        entregado: 'fechaEntregada',
        completada: 'fechaCompletada'
      };
      const columnaFecha = columnasFecha[nuevoEstado];
      const query = columnaFecha
        ? `UPDATE ordenes SET estado = ?, ${columnaFecha} = COALESCE(${columnaFecha}, ?) WHERE id = ?`
        : 'UPDATE ordenes SET estado = ? WHERE id = ?';
      const params = columnaFecha
        ? [nuevoEstado, new Date().toISOString(), id]
        : [nuevoEstado, id];

      db.run(query, params, function(err) {
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

  static actualizarEstadoPago(id, estadoPago, fechaPago = new Date().toISOString()) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.run(
        'UPDATE ordenes SET estadoPago = ?, fechaPago = CASE WHEN ? = ? THEN COALESCE(fechaPago, ?) ELSE fechaPago END WHERE id = ?',
        [estadoPago, estadoPago, 'pagado', fechaPago, id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  static eliminarDefinitivamente(id) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.serialize(() => {
        db.run('DELETE FROM orden_historial WHERE ordenId = ?', [id], (histErr) => {
          if (histErr) { reject(histErr); return; }
          db.run('DELETE FROM notificaciones WHERE ordenId = ?', [id], (notifErr) => {
            if (notifErr) { reject(notifErr); return; }
            db.run('DELETE FROM ordenes WHERE id = ?', [id], function(err) {
              if (err) reject(err);
              else resolve(this.changes > 0);
            });
          });
        });
      });
    });
  }

  static registrarHistorial({
    ordenId,
    estadoAnterior = null,
    estadoNuevo,
    actorUsuarioId = null,
    actorRol = 'sistema',
    nota = null
  }) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.run(`
        INSERT INTO orden_historial
          (ordenId, estadoAnterior, estadoNuevo, actorUsuarioId, actorRol, nota)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [ordenId, estadoAnterior, estadoNuevo, actorUsuarioId, actorRol, nota], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  static obtenerHistorial(ordenId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all(`
        SELECT h.*, u.nombre AS actorNombre
        FROM orden_historial h
        LEFT JOIN usuarios u ON h.actorUsuarioId = u.id
        WHERE h.ordenId = ?
        ORDER BY h.fechaCreacion ASC, h.id ASC
      `, [ordenId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  static usuarioRecibioProducto(usuarioId, productoId) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.get(`
        SELECT id
        FROM ordenes
        WHERE usuarioId = ?
          AND estado IN ('entregado', 'completada')
          AND EXISTS (
            SELECT 1
            FROM json_each(ordenes.productosJSON)
            WHERE CAST(json_extract(json_each.value, '$.productoId') AS INTEGER) = ?
          )
        LIMIT 1
      `, [usuarioId, productoId], (err, row) => {
        if (err) reject(err);
        else resolve(Boolean(row));
      });
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
          SUM(CASE WHEN estadoPago = 'pagado' THEN total ELSE 0 END) as ingresoTotal,
          COUNT(CASE WHEN estado = 'completada' THEN 1 END) as completadas,
          COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes
        FROM ordenes
        WHERE estado != 'pago_pendiente'
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row || {});
      });
    });
  }
}

module.exports = OrdenesRepository;
