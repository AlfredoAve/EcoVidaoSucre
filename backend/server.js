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

const cors = require('cors');
const app = express();

// Middleware
app.use(cors({
  origin: ['https://eco-vida-sucre.vercel.app', 'http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Servir frontend estático
app.use('/frontend', express.static(path.join(__dirname, '..', 'frontend')));

// Servir carpeta de uploads (imágenes subidas por el admin)
const fs = require('fs');
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath);
app.use('/uploads', express.static(uploadsPath));

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
  res.redirect('/frontend/index.html');
});

// Compatibilidad: permitir acceso histórico sin /html
app.get('/frontend', (req, res) => {
  res.redirect('/frontend/index.html');
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
  res.status(404).sendFile(path.join(__dirname, '..', 'frontend', '404.html'));
});

initDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor EcoVida escuchando en puerto ${PORT}`);
      console.log(`📱 Local: http://localhost:${PORT}/frontend/index.html`);
      console.log(`🌐 Network: http://[TU-IP-LOCAL]:${PORT}/frontend/index.html`);
    });
  })
  .catch(err => {
    console.error('❌ Error al inicializar BD:', err);
    process.exit(1);
  });
