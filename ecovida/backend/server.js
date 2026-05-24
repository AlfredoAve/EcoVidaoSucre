require('dotenv').config();
const express = require('express');
const path = require('path');
const { initDB } = require('./src/config/database');

// Importar controladores
const authController = require('./src/controllers/authController');
const productosController = require('./src/controllers/productosController');
const carritoController = require('./src/controllers/carritoController');
const ordenesController = require('./src/controllers/ordenesController');
const resenasController = require('./src/controllers/resenasController');
const categoriaController = require('./src/controllers/categoriaController');
const adminController = require('./src/controllers/adminController');
const userController = require('./src/controllers/userController');
const paypalController = require('./src/controllers/paypalController');
const favoritosController = require('./src/controllers/favoritosController');

const app = express();

// Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Servir frontend estático
app.use('/frontend/html', express.static(path.join(__dirname, '..', 'frontend', 'html')));
app.use('/frontend/js', express.static(path.join(__dirname, '..', 'frontend', 'js')));
app.use('/frontend/CSS', express.static(path.join(__dirname, '..', 'frontend', 'CSS')));
app.use('/frontend/images', express.static(path.join(__dirname, '..', 'frontend', 'images')));

// Rutas API
app.use('/api/auth', authController);
app.use('/api/productos', productosController);
app.use('/api/carrito', carritoController);
app.use('/api/ordenes', ordenesController);
app.use('/api/resenas', resenasController);
app.use('/api/categorias', categoriaController);
app.use('/api/admin', adminController);
app.use('/api/users', userController);
app.use('/api/paypal', paypalController);
app.use('/api/favoritos', favoritosController);

// Ruta raíz: redirige a la página principal
app.get('/', (req, res) => {
  res.redirect('/frontend/html/index.html');
});

// Compatibilidad: permitir acceso histórico sin /html
app.get('/frontend', (req, res) => {
  res.redirect('/frontend/html/index.html');
});

app.get('/frontend/index.html', (req, res) => {
  res.redirect('/frontend/html/index.html');
});

// Sitemap y robots.txt
app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'sitemap.xml'));
});
app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'robots.txt'));
});

// Ruta de contacto
const contactoController = require('./src/controllers/contactoController');
app.use('/api/contacto', contactoController);

const PORT = process.env.PORT || 3001;

// Handler 404 — debe ir al final, después de todas las rutas
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '..', 'frontend', 'html', '404.html'));
});

initDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor EcoVida escuchando en puerto ${PORT}`);
      console.log(`📱 Local: http://localhost:${PORT}/frontend/html/index.html`);
      console.log(`🌐 Network: http://[TU-IP-LOCAL]:${PORT}/frontend/html/index.html`);
    });
  })
  .catch(err => {
    console.error('❌ Error al inicializar BD:', err);
    process.exit(1);
  });
