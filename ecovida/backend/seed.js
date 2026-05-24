// Script para llenar la BD con datos de prueba
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcryptjs = require('bcryptjs');

const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

// Primero crear las tablas
function createTables() {
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
      `, (err) => {
        if (err) reject(err);
        else {
          console.log('✅ Tablas creadas');
          resolve();
        }
      });
    });
  });
}

// Datos a insertar
const categorias = [
  { nombre: 'Proteínas', descripcion: 'Proteínas de origen natural', imagen: '../images/producto-1.svg' },
  { nombre: 'Vitaminas', descripcion: 'Suplementos vitamínicos', imagen: '../images/producto-2.svg' },
  { nombre: 'Tés Naturales', descripcion: 'Infusiones y tés orgánicos', imagen: '../images/producto-4.svg' },
  { nombre: 'Frutas Secas', descripcion: 'Frutas deshidratadas naturales', imagen: '../images/producto-5.svg' },
  { nombre: 'Miel y Abejas', descripcion: 'Productos de la colmena', imagen: '../images/producto-6.svg' }
];

const productos = [
  { nombre: 'Proteína de Soja', descripcion: 'Proteína vegana 100% natural', precio: 45.99, stock: 20, categoriaId: 1, imagen: '../images/producto-1.svg' },
  { nombre: 'Vitamina C Natural', descripcion: 'Vitamina C extraída de naranja', precio: 32.50, stock: 15, categoriaId: 2, imagen: '../images/producto-2.svg' },
  { nombre: 'Té Verde Orgánico', descripcion: 'Té verde premium sin pesticidas', precio: 28.00, stock: 30, categoriaId: 3, imagen: '../images/producto-4.svg' },
  { nombre: 'Almendras Secas', descripcion: 'Almendras tostadas naturales', precio: 38.75, stock: 25, categoriaId: 4, imagen: '../images/producto-5.svg' },
  { nombre: 'Miel Pura', descripcion: 'Miel de abejas sin procesar', precio: 55.00, stock: 18, categoriaId: 5, imagen: '../images/producto-6.svg' },
  { nombre: 'Omega 3 Natural', descripcion: 'Aceite de pescado premium', precio: 65.99, stock: 12, categoriaId: 2, imagen: '../images/producto-3.svg' }
];

// Ejecutar
createTables().then(() => {
  // Insertar categorías
  categorias.forEach(cat => {
    db.run(
      'INSERT OR IGNORE INTO categorias (nombre, descripcion, imagen) VALUES (?, ?, ?)',
      [cat.nombre, cat.descripcion, cat.imagen],
      function(err) {
        if (!err) console.log('✅ Categoría:', cat.nombre);
      }
    );
  });

  // Insertar productos (esperar a que se creen las categorías)
  setTimeout(() => {
    productos.forEach(prod => {
      db.run(
        'INSERT INTO productos (nombre, descripcion, precio, stock, categoriaId, imagen) VALUES (?, ?, ?, ?, ?, ?)',
        [prod.nombre, prod.descripcion, prod.precio, prod.stock, prod.categoriaId, prod.imagen],
        function(err) {
          if (!err) console.log('✅ Producto:', prod.nombre);
        }
      );
    });
  }, 500);

  // Crear usuarios (esperar más)
  setTimeout(() => {
    const adminPass = bcryptjs.hashSync('admin123', 10);
    const clientPass = bcryptjs.hashSync('cliente123', 10);

    db.run(
      'INSERT OR IGNORE INTO usuarios (nombre, email, contrasena, rol) VALUES (?, ?, ?, ?)',
      ['Admin EcoVida', 'admin@ecovida.com', adminPass, 'admin'],
      function(err) {
        if (!err) console.log('✅ Usuario Admin: admin@ecovida.com / admin123');
      }
    );

    db.run(
      'INSERT OR IGNORE INTO usuarios (nombre, email, contrasena, rol, telefono, direccion, ciudad) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Juan Pérez', 'cliente@ecovida.com', clientPass, 'cliente', '+591 78451268', 'Calle Principal 123', 'Sucre'],
      function(err) {
        if (!err) console.log('✅ Usuario Cliente: cliente@ecovida.com / cliente123');
      }
    );
  }, 1000);

  // Cerrar después de 2 segundos
  setTimeout(() => {
    console.log('\n✅ Datos cargados exitosamente!\n');
    db.close();
    process.exit(0);
  }, 2000);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

