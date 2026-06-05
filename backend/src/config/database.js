const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let db = null;

function resolveDatabasePath() {
  if (process.env.DATABASE_PATH) {
    return path.resolve(process.env.DATABASE_PATH);
  }

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
          destacado BOOLEAN DEFAULT 0,
          beneficiosJSON TEXT DEFAULT '[]',
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
          estadoPago TEXT DEFAULT 'pendiente',
          direccionEnvio TEXT NOT NULL,
          metodoPago TEXT DEFAULT 'mercadopago',
          fechaPago DATETIME,
          numeroSeguimiento TEXT,
          fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          fechaConfirmada DATETIME,
          fechaEnviada DATETIME,
          fechaEntregaReportada DATETIME,
          fechaEntregada DATETIME,
          fechaCompletada DATETIME,
          FOREIGN KEY(usuarioId) REFERENCES usuarios(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS orden_historial (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ordenId INTEGER NOT NULL,
          estadoAnterior TEXT,
          estadoNuevo TEXT NOT NULL,
          actorUsuarioId INTEGER,
          actorRol TEXT DEFAULT 'sistema',
          nota TEXT,
          fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(ordenId) REFERENCES ordenes(id) ON DELETE CASCADE,
          FOREIGN KEY(actorUsuarioId) REFERENCES usuarios(id)
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
          ordenId INTEGER,
          tipo TEXT NOT NULL,
          mensaje TEXT NOT NULL,
          enlace TEXT,
          leida BOOLEAN DEFAULT 0,
          fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(usuarioId) REFERENCES usuarios(id),
          FOREIGN KEY(ordenId) REFERENCES ordenes(id) ON DELETE CASCADE
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
        db.run('CREATE INDEX IF NOT EXISTS idx_orden_historial_orden ON orden_historial(ordenId)');
        db.run('CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuarioId, leida)');

        // Migraciones ligeras para BD antiguas
        db.all('PRAGMA table_info(categorias)', (colErr, columns) => {
          if (colErr) {
            console.error('Error leyendo columnas de categorias:', colErr);
            reject(colErr);
            return;
          }

          const existeActiva = (columns || []).some((c) => c.name === 'activa');

          const finishMigrations = () => {
            db.run('CREATE INDEX IF NOT EXISTS idx_productos_destacado ON productos(destacado)');
            console.log('✅ Tablas creadas/verificadas');
            resolve();
          };

          const addOrderMigrations = () => {
            db.all('PRAGMA table_info(ordenes)', (oErr, oColumns) => {
              if (oErr) { reject(oErr); return; }
              const columnas = new Set((oColumns || []).map(c => c.name));
              const faltantes = [
                ['paypalOrderId', 'TEXT'],
                ['estadoPago', "TEXT DEFAULT 'pendiente'"],
                ['fechaPago', 'DATETIME'],
                ['fechaConfirmada', 'DATETIME'],
                ['fechaEnviada', 'DATETIME'],
                ['fechaEntregaReportada', 'DATETIME'],
                ['fechaEntregada', 'DATETIME']
              ].filter(([nombre]) => !columnas.has(nombre));

              const agregarSiguiente = () => {
                const siguiente = faltantes.shift();
                if (!siguiente) {
                  db.run(`
                    UPDATE ordenes
                    SET
                      estado = CASE
                        WHEN estado = 'entrega_reportada' THEN 'enviado'
                        ELSE estado
                      END,
                      fechaConfirmada = CASE
                        WHEN estado IN ('confirmada', 'enviado', 'entrega_reportada', 'entregado', 'completada')
                        THEN COALESCE(fechaConfirmada, fechaCreacion)
                        ELSE fechaConfirmada
                      END,
                      fechaEnviada = CASE
                        WHEN estado IN ('enviado', 'entrega_reportada', 'entregado', 'completada')
                        THEN COALESCE(fechaEnviada, fechaCreacion)
                        ELSE fechaEnviada
                      END,
                      fechaEntregaReportada = CASE
                        WHEN estado IN ('entrega_reportada', 'entregado', 'completada')
                        THEN COALESCE(fechaEntregaReportada, fechaCreacion)
                        ELSE fechaEntregaReportada
                      END,
                      fechaEntregada = CASE
                        WHEN estado IN ('entregado', 'completada')
                        THEN COALESCE(fechaEntregada, fechaCreacion)
                        ELSE fechaEntregada
                      END,
                      estadoPago = CASE
                        WHEN metodoPago = 'paypal' AND estado != 'pago_pendiente' THEN 'pagado'
                        WHEN metodoPago != 'paypal' AND estado IN ('entregado', 'completada') THEN 'pagado'
                        ELSE COALESCE(estadoPago, 'pendiente')
                      END,
                      fechaPago = CASE
                        WHEN (
                          (metodoPago = 'paypal' AND estado != 'pago_pendiente')
                          OR (metodoPago != 'paypal' AND estado IN ('entregado', 'completada'))
                        )
                        THEN COALESCE(fechaPago, fechaEntregada, fechaConfirmada, fechaCreacion)
                        ELSE fechaPago
                      END
                  `, (updateErr) => {
                    if (updateErr) { reject(updateErr); return; }
                    db.all('PRAGMA table_info(notificaciones)', (nErr, nColumns) => {
                    if (nErr) { reject(nErr); return; }
                    const nCols = new Set((nColumns || []).map(c => c.name));
                    const nFaltantes = [
                      ['ordenId', 'INTEGER'],
                      ['enlace', 'TEXT']
                    ].filter(([nombre]) => !nCols.has(nombre));

                    const agregarNotificacion = () => {
                      const columna = nFaltantes.shift();
                      if (!columna) {
                        db.run(`
                          INSERT INTO orden_historial (ordenId, estadoAnterior, estadoNuevo, actorRol, nota, fechaCreacion)
                          SELECT o.id, NULL, o.estado, 'sistema', 'Estado inicial migrado', o.fechaCreacion
                          FROM ordenes o
                          WHERE o.estado != 'pago_pendiente'
                            AND NOT EXISTS (
                              SELECT 1 FROM orden_historial h WHERE h.ordenId = o.id
                            )
                        `, finishMigrations);
                        return;
                      }
                      db.run(`ALTER TABLE notificaciones ADD COLUMN ${columna[0]} ${columna[1]}`, (altErr) => {
                        if (altErr) { reject(altErr); return; }
                        agregarNotificacion();
                      });
                    };
                    agregarNotificacion();
                  });
                  });
                  return;
                }
                db.run(`ALTER TABLE ordenes ADD COLUMN ${siguiente[0]} ${siguiente[1]}`, (altErr) => {
                  if (altErr) { reject(altErr); return; }
                  agregarSiguiente();
                });
              };
              agregarSiguiente();
            });
          };

          const addBeneficiosMigration = () => {
            db.all('PRAGMA table_info(productos)', (pErr, pColumns) => {
              if (pErr) { reject(pErr); return; }
              const existeBeneficios = (pColumns || []).some((c) => c.name === 'beneficiosJSON');
              if (existeBeneficios) {
                addOrderMigrations();
                return;
              }

              db.run("ALTER TABLE productos ADD COLUMN beneficiosJSON TEXT DEFAULT '[]'", (altErr) => {
                if (altErr) { reject(altErr); return; }
                addOrderMigrations();
              });
            });
          };

          const addDestacadoMigration = () => {
            db.all('PRAGMA table_info(productos)', (pErr, pColumns) => {
              if (pErr) { reject(pErr); return; }
              const existeDestacado = (pColumns || []).some((c) => c.name === 'destacado');
              if (existeDestacado) {
                addBeneficiosMigration();
                return;
              }

              db.run('ALTER TABLE productos ADD COLUMN destacado BOOLEAN DEFAULT 0', (altErr) => {
                if (altErr) { reject(altErr); return; }
                // Conservar como destacados los productos que ya se mostraban en el inicio.
                db.run(`
                  UPDATE productos
                  SET destacado = 1
                  WHERE id IN (
                    SELECT id FROM productos
                    WHERE activo = 1
                    ORDER BY nombre
                    LIMIT 6
                  )
                `, (updateErr) => {
                  if (updateErr) { reject(updateErr); return; }
                  addBeneficiosMigration();
                });
              });
            });
          };

          if (existeActiva) {
            addDestacadoMigration();
            return;
          }

          db.run('ALTER TABLE categorias ADD COLUMN activa BOOLEAN DEFAULT 1', (altErr) => {
            if (altErr) {
              console.error('Error agregando columna activa:', altErr);
              reject(altErr);
              return;
            }
            addDestacadoMigration();
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
