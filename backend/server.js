require('dotenv').config();
const express = require('express');
const path = require('path');
const { initDB } = require('./src/config/database');
// [NUEVO] Importar middlewares de seguridad y compresión
const helmet = require('helmet');
const compression = require('compression');

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
const notificacionesController = require('./src/controllers/notificacionesController');

const cors = require('cors');
const app = express();

// [NUEVO] Aplicar Helmet globalmente para seguridad, pero deshabilitando CSP para evitar bloqueos
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// [NUEVO] Aplicar compresión GZIP
app.use(compression());

// Middleware
// [CORREGIDO] CORS ampliado para cubrir localhost con y sin puerto,
// y cualquier subdominio de Vercel/Render donde esté el frontend
const allowedOrigins = [
  'https://eco-vida-sucre.vercel.app',
  'https://ecovida-backend.onrender.com',
  'http://localhost:3001',
  'http://localhost:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3000',
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (Postman, apps móviles, mismo servidor)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Permitir cualquier subdominio de onrender.com o vercel.app
    if (/\.onrender\.com$/.test(origin) || /\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error('CORS no permitido para: ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Servir frontend estático
app.use('/frontend', express.static(path.join(__dirname, '..', 'frontend')));

// Servir carpeta de uploads (imágenes subidas por el admin)
const fs = require('fs');
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath);
app.get('/uploads/:filename', (req, res, next) => {
  const requested = path.basename(req.params.filename);
  const parsed = path.parse(requested);
  const webpName = `${parsed.name}.webp`;
  const webpPath = path.join(uploadsPath, webpName);
  const jpgName = `${parsed.name}.jpg`;
  const jpgPath = path.join(uploadsPath, jpgName);
  const requestExt = parsed.ext.toLowerCase();

  if (['.png', '.jpg', '.jpeg'].includes(requestExt) && fs.existsSync(webpPath)) {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.type('webp');
    return res.sendFile(webpPath);
  }

  if (requestExt === '.png' && fs.existsSync(jpgPath)) {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.type('jpg');
    return res.sendFile(jpgPath);
  }

  return next();
});
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

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
app.use('/api/notificaciones', notificacionesController);

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

const PORT = process.env.PORT || (process.env.RENDER ? 10000 : 3001);

// Handler 404 — debe ir al final, después de todas las rutas
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '..', 'frontend', '404.html'));
});

initDB()
  .then(() => {
    // Verificar variables de entorno críticas
    const warnings = [];
    if (!process.env.PAYPAL_CLIENT_ID) warnings.push('⚠️  PAYPAL_CLIENT_ID no definido — PayPal no funcionará');
    if (!process.env.PAYPAL_SECRET)    warnings.push('⚠️  PAYPAL_SECRET no definido — PayPal no funcionará');
    if (!process.env.PAYPAL_BASE_URL)  warnings.push('ℹ️  PAYPAL_BASE_URL no definido — usando sandbox por defecto');
    if (!process.env.JWT_SECRET)       warnings.push('⚠️  JWT_SECRET no definido — usando clave insegura por defecto');
    if (warnings.length) {
      console.log('\n════════════ ADVERTENCIAS DE CONFIGURACIÓN ════════════');
      warnings.forEach(w => console.log(w));
      console.log('═══════════════════════════════════════════════════════\n');
    }

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
