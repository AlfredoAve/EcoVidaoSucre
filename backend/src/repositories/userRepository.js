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
}

module.exports = UserRepository;
