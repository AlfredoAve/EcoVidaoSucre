const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let db = null;

function resolveDatabasePath() {
  const primaryPath = path.join(__dirname, '..', '..', 'database.db');
  const legacyPath = path.join(__dirname, '..', 'database.db');

  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }

  if (fs.existsSync(legacyPath)) {
    return legacyPath;
  }

  return primaryPath;
}

async function initDB() {
  return new Promise((resolve, reject) => {
    const dbPath = resolveDatabasePath();

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error al conectar con la BD:', err);
        reject(err);
      } else {
        console.log(`✅ Conectado a SQLite: ${dbPath}`);
        createTables()
          .then(() => seedCategoryImages())
          .then(() => resolve(db))
          .catch(reject);
      }
    });
  });
}

async function createTables() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Tabla de Usuarios
      db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          contrasena TEXT NOT NULL,
          rol TEXT DEFAULT 'cliente',
          telefono TEXT,
          direccion TEXT,
          ciudad TEXT,
          activo BOOLEAN DEFAULT 1,
          fechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de Categorías
      db.run(`
        CREATE TABLE IF NOT EXISTS categorias (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT UNIQUE NOT NULL,
          descripcion TEXT,
          imagen TEXT,
          activa BOOLEAN DEFAULT 1
        )
      `);

      // Tabla de Productos
      db.run(`
        CREATE TABLE IF NOT EXISTS productos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          descripcion TEXT,
          precio REAL NOT NULL,
          stock INTEGER DEFAULT 0,
          categoriaId INTEGER NOT NULL,
          imagen TEXT,
          activo BOOLEAN DEFAULT 1,
          fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(categoriaId) REFERENCES categorias(id)
        )
      `);

      // Tabla de Carrito
      db.run(`
        CREATE TABLE IF NOT EXISTS carrito (
          usuarioId INTEGER NOT NULL,
          productoId INTEGER NOT NULL,
          cantidad INTEGER DEFAULT 1,
          precioUnitario REAL NOT NULL,
          fechaAgregado DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (usuarioId, productoId),
          FOREIGN KEY(usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE,
          FOREIGN KEY(productoId) REFERENCES productos(id) ON DELETE CASCADE
        )
      `);

      // Tabla de Órdenes
      db.run(`
        CREATE TABLE IF NOT EXISTS ordenes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuarioId INTEGER NOT NULL,
          productosJSON JSON NOT NULL,
          total REAL NOT NULL,
          estado TEXT DEFAULT 'pendiente',
          direccionEnvio TEXT NOT NULL,
          metodoPago TEXT DEFAULT 'mercadopago',
          numeroSeguimiento TEXT,
          fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          fechaCompletada DATETIME,
          FOREIGN KEY(usuarioId) REFERENCES usuarios(id)
        )
      `);

      // Tabla de Reseñas
      db.run(`
        CREATE TABLE IF NOT EXISTS resenas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuarioId INTEGER NOT NULL,
          productoId INTEGER NOT NULL,
          calificacion INTEGER NOT NULL,
          comentario TEXT,
          fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(usuarioId) REFERENCES usuarios(id),
          FOREIGN KEY(productoId) REFERENCES productos(id),
          UNIQUE(usuarioId, productoId)
        )
      `);

      // Tabla de Favoritos
      db.run(`
        CREATE TABLE IF NOT EXISTS favoritos (
          usuarioId INTEGER NOT NULL,
          productoId INTEGER NOT NULL,
          fechaAgregado DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (usuarioId, productoId),
          FOREIGN KEY(usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE,
          FOREIGN KEY(productoId) REFERENCES productos(id) ON DELETE CASCADE
        )
      `);

      // Tabla de Notificaciones
      db.run(`
        CREATE TABLE IF NOT EXISTS notificaciones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuarioId INTEGER NOT NULL,
          tipo TEXT NOT NULL,
          mensaje TEXT NOT NULL,
          leida BOOLEAN DEFAULT 0,
          fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(usuarioId) REFERENCES usuarios(id)
        )
      `);

      // Tabla de mensajes de contacto
      db.run(`
        CREATE TABLE IF NOT EXISTS contacto_mensajes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          email TEXT NOT NULL,
          asunto TEXT NOT NULL,
          mensaje TEXT NOT NULL,
          leido BOOLEAN DEFAULT 0,
          fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creando tablas:', err);
          reject(err);
          return;
        }

        // [NUEVO] Índices en Base de Datos para mejorar escalabilidad y consultas
        db.run('CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoriaId)');
        db.run('CREATE INDEX IF NOT EXISTS idx_ordenes_usuario ON ordenes(usuarioId)');
        db.run('CREATE INDEX IF NOT EXISTS idx_carrito_usuario ON carrito(usuarioId)');
        db.run('CREATE INDEX IF NOT EXISTS idx_resenas_producto ON resenas(productoId)');
        db.run('CREATE INDEX IF NOT EXISTS idx_favoritos_usuario ON favoritos(usuarioId)');

        // Migraciones ligeras para BD antiguas
        db.all('PRAGMA table_info(categorias)', (colErr, columns) => {
          if (colErr) {
            console.error('Error leyendo columnas de categorias:', colErr);
            reject(colErr);
            return;
          }

          const existeActiva = (columns || []).some((c) => c.name === 'activa');

          const addPaypalMigration = () => {
            db.all('PRAGMA table_info(ordenes)', (oErr, oColumns) => {
              if (oErr) { reject(oErr); return; }
              const existePaypal = (oColumns || []).some((c) => c.name === 'paypalOrderId');
              if (existePaypal) {
                console.log('✅ Tablas creadas/verificadas');
                resolve();
                return;
              }
              db.run('ALTER TABLE ordenes ADD COLUMN paypalOrderId TEXT', (altErr2) => {
                if (altErr2) { reject(altErr2); return; }
                console.log('✅ Tablas creadas/verificadas');
                resolve();
              });
            });
          };

          if (existeActiva) {
            addPaypalMigration();
            return;
          }

          db.run('ALTER TABLE categorias ADD COLUMN activa BOOLEAN DEFAULT 1', (altErr) => {
            if (altErr) {
              console.error('Error agregando columna activa:', altErr);
              reject(altErr);
              return;
            }
            addPaypalMigration();
          });
        });
      });
    });
  });
}

function seedCategoryImages() {
  if (!db) return Promise.resolve();
  const forced = [
    ['Proteínas',    'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400&q=80'],
    ['Tés Naturales','https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80'],
    ['Vitaminas',    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80'],
  ];
  const defaults = [
    ['Miel',          'https://images.unsplash.com/photo-1471943038255-0dc8bcd8de73?w=400&q=80'],
    ['Aceites',       'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80'],
    ['Superalimentos','https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80'],
    ['Frutas Secas',  'https://images.unsplash.com/photo-1514315384763-ba401779410f?w=400&q=80'],
    ['Especias',      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&q=80'],
  ];
  const stmts = [
    ...forced.map(([n, img]) => ({ sql: "UPDATE categorias SET imagen = ? WHERE nombre = ? AND (imagen IS NULL OR imagen = '')", p: [img, n] })),
    ...defaults.map(([n, img]) => ({ sql: "UPDATE categorias SET imagen = ? WHERE nombre = ? AND (imagen IS NULL OR imagen = '')", p: [img, n] })),
  ];
  return new Promise((resolve) => {
    let done = 0;
    stmts.forEach(({ sql, p }) => db.run(sql, p, () => { if (++done === stmts.length) resolve(); }));
  });
}

function getDB() {
  return db;
}

module.exports = { initDB, getDB };
