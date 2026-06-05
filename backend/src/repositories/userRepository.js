const { getDB } = require('../config/database');

class UserRepository {
  static crearUsuario(usuario) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      const query = `
        INSERT INTO usuarios (nombre, email, contrasena, rol, telefono, direccion, ciudad)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      db.run(query,
        [usuario.nombre, usuario.email, usuario.contrasena, usuario.rol,
         usuario.telefono, usuario.direccion, usuario.ciudad],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  static obtenerPorEmail(email) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.get('SELECT * FROM usuarios WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static obtenerPorId(id) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.get('SELECT * FROM usuarios WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static actualizarUsuario(id, datos) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      const campos = Object.keys(datos).map(k => `${k} = ?`).join(', ');
      const valores = Object.values(datos);
      const query = `UPDATE usuarios SET ${campos} WHERE id = ?`;

      db.run(query, [...valores, id], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  static obtenerTodos() {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all('SELECT id, nombre, email, rol, telefono, activo FROM usuarios', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static desactivarUsuario(id) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.run('UPDATE usuarios SET activo = 0 WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  static obtenerOrdenesIds(id) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      db.all('SELECT id FROM ordenes WHERE usuarioId = ?', [id], (err, rows) => {
        if (err) reject(err);
        else resolve((rows || []).map(row => row.id));
      });
    });
  }

  static eliminarDefinitivamente(id) {
    return new Promise((resolve, reject) => {
      const db = getDB();
      const run = (sql, params = []) => new Promise((res, rej) => {
        db.run(sql, params, function(err) {
          if (err) rej(err);
          else res(this.changes);
        });
      });

      db.serialize(() => {
        db.all('SELECT id FROM ordenes WHERE usuarioId = ?', [id], async (selectErr, ordenes) => {
          if (selectErr) { reject(selectErr); return; }
          try {
            const ordenIds = (ordenes || []).map(orden => orden.id);
            if (ordenIds.length) {
              const placeholders = ordenIds.map(() => '?').join(',');
              await run(`DELETE FROM orden_historial WHERE ordenId IN (${placeholders})`, ordenIds);
              await run(`DELETE FROM notificaciones WHERE ordenId IN (${placeholders})`, ordenIds);
              await run(`DELETE FROM ordenes WHERE id IN (${placeholders})`, ordenIds);
            }

            await run('DELETE FROM carrito WHERE usuarioId = ?', [id]);
            await run('DELETE FROM favoritos WHERE usuarioId = ?', [id]);
            await run('DELETE FROM resenas WHERE usuarioId = ?', [id]);
            await run('DELETE FROM notificaciones WHERE usuarioId = ?', [id]);
            const cambios = await run('DELETE FROM usuarios WHERE id = ?', [id]);
            resolve(cambios > 0);
          } catch (err) {
            reject(err);
          }
        });
      });
    });
  }
}

module.exports = UserRepository;
