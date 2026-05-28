const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ProductosRepository = require('../repositories/productosRepository');
const Producto = require('../models/Producto');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.use(adminMiddleware);

const uploadDir = path.join(__dirname, '..', '..', '..', 'frontend', 'images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext && ext.length <= 10 ? ext : '';
    const name = `img_${Date.now()}_${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }
    cb(new Error('Solo se permiten imagenes'));
  }
});

// POST /api/admin/upload - Subir imagen
router.post('/upload', (req, res) => {
  upload.single('imagen')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error al subir imagen' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Archivo requerido' });
    }

    res.json({ exito: true, url: `/frontend/images/${req.file.filename}` });
  });
});

// GET /api/admin/productos - Listar todos los productos
router.get('/productos', async (req, res) => {
  try {
    const productos = await ProductosRepository.obtenerProductosAdmin();
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/productos - Crear producto
router.post('/productos', async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, categoriaId, imagen } = req.body;

    if (!nombre || !precio || !stock || !categoriaId) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const producto = new Producto(nombre, descripcion, precio, stock, categoriaId, imagen);
    const productoId = await ProductosRepository.crearProducto(producto);

    res.json({ exito: true, id: productoId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/productos/:id - Actualizar producto
router.put('/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock, categoriaId, imagen, activo } = req.body;

    const datos = { nombre, descripcion, precio, stock, categoriaId, imagen, activo };
    Object.keys(datos).forEach((k) => {
      if (datos[k] === undefined) delete datos[k];
    });

    if (!Object.keys(datos).length) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const actualizado = await ProductosRepository.actualizarProducto(id, datos);

    if (!actualizado) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ exito: true, mensaje: 'Producto actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/productos/:id - Desactivar producto
router.delete('/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const desactivado = await ProductosRepository.desactivarProducto(id);

    if (!desactivado) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ exito: true, mensaje: 'Producto desactivado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
