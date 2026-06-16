const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const ProductosRepository = require('../repositories/productosRepository');
const Producto = require('../models/Producto');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.use(adminMiddleware);

function normalizarDatosProducto(datos) {
  const normalizados = { ...datos };

  if (normalizados.precio !== undefined) normalizados.precio = Number(normalizados.precio);
  if (normalizados.stock !== undefined) normalizados.stock = Number(normalizados.stock);
  if (normalizados.categoriaId !== undefined) normalizados.categoriaId = Number(normalizados.categoriaId);
  if (normalizados.destacado !== undefined) {
    normalizados.destacado = [true, 1, '1', 'true'].includes(normalizados.destacado) ? 1 : 0;
  }
  if (normalizados.beneficios !== undefined) {
    normalizados.beneficios = normalizarBeneficios(normalizados.beneficios);
  }

  return normalizados;
}

function normalizarBeneficios(valor) {
  const items = Array.isArray(valor) ? valor : String(valor || '').split(/\r?\n/);
  return items.map(item => String(item).trim()).filter(Boolean);
}

function errorDatosProducto(datos, requiereTodos = false) {
  if (requiereTodos && (!datos.nombre || datos.precio === undefined || datos.stock === undefined || !datos.categoriaId)) {
    return 'Datos incompletos';
  }
  if (datos.precio !== undefined && (!Number.isFinite(datos.precio) || datos.precio <= 0)) {
    return 'Precio inválido';
  }
  if (datos.stock !== undefined && (!Number.isInteger(datos.stock) || datos.stock < 0)) {
    return 'Stock inválido';
  }
  if (datos.categoriaId !== undefined && (!Number.isInteger(datos.categoriaId) || datos.categoriaId < 1)) {
    return 'Categoría inválida';
  }
  if (datos.beneficios !== undefined) {
    if (datos.beneficios.length > 5) {
      return 'Puedes agregar como máximo 5 beneficios';
    }
    if (datos.beneficios.some(beneficio => beneficio.length > 80)) {
      return 'Cada beneficio puede tener como máximo 80 caracteres';
    }
  }
  return null;
}

function eliminarImagenUpload(imagen) {
  if (!imagen || !imagen.includes('/uploads/')) return;

  const uploadsDir = path.resolve(__dirname, '../../uploads');
  const nombre = path.basename(imagen);
  const parsed = path.parse(nombre);
  const candidatos = [
    nombre,
    `${parsed.name}.webp`,
    `${parsed.name}.jpg`,
    `${parsed.name}.jpeg`,
    `${parsed.name}.png`,
  ];

  [...new Set(candidatos)].forEach(archivo => {
    const imagenPath = path.resolve(uploadsDir, archivo);
    if (imagenPath.startsWith(uploadsDir) && fs.existsSync(imagenPath)) {
      fs.unlinkSync(imagenPath);
    }
  });
}

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
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
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }
    cb(new Error('Solo se permiten imagenes'));
  }
});

async function optimizarImagenSubida(file) {
  const originalPath = path.resolve(file.path);
  const parsed = path.parse(file.filename);
  const optimizedName = `${parsed.name}.webp`;
  const optimizedPath = path.resolve(uploadDir, optimizedName);

  if (!originalPath.startsWith(path.resolve(uploadDir)) || !optimizedPath.startsWith(path.resolve(uploadDir))) {
    throw new Error('Ruta de imagen invalida');
  }

  await sharp(originalPath)
    .rotate()
    .resize({
      width: 1200,
      height: 1200,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: 82,
      effort: 4,
    })
    .toFile(optimizedPath);

  if (originalPath !== optimizedPath && fs.existsSync(originalPath)) {
    fs.unlinkSync(originalPath);
  }

  return optimizedName;
}

// POST /api/admin/upload - Subir imagen
router.post('/upload', (req, res) => {
  upload.single('imagen')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error al subir imagen' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Archivo requerido' });
    }

    try {
      const optimizedName = await optimizarImagenSubida(req.file);
      res.json({ exito: true, url: `/uploads/${optimizedName}` });
    } catch (error) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'No se pudo optimizar la imagen' });
    }
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
    const datos = normalizarDatosProducto(req.body);
    const { nombre, descripcion, precio, stock, categoriaId, imagen, destacado = 0, beneficios = [] } = datos;
    const error = errorDatosProducto(datos, true);

    if (error) {
      return res.status(400).json({ error });
    }

    const producto = new Producto(nombre, descripcion, precio, stock, categoriaId, imagen, destacado, beneficios);
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
    const { nombre, descripcion, precio, stock, categoriaId, imagen, activo, destacado, beneficios } = req.body;

    const datos = normalizarDatosProducto({ nombre, descripcion, precio, stock, categoriaId, imagen, activo, destacado, beneficios });
    Object.keys(datos).forEach((k) => {
      if (datos[k] === undefined) delete datos[k];
    });

    if (!Object.keys(datos).length) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const error = errorDatosProducto(datos);
    if (error) {
      return res.status(400).json({ error });
    }

    if (datos.beneficios !== undefined) {
      datos.beneficiosJSON = JSON.stringify(datos.beneficios);
      delete datos.beneficios;
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

// DELETE /api/admin/productos/:id/definitivo - Eliminar producto de la base de datos
router.delete('/productos/:id/definitivo', async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await ProductosRepository.obtenerPorIdAdmin(id);

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const eliminado = await ProductosRepository.eliminarDefinitivamente(id);
    if (!eliminado) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    eliminarImagenUpload(producto.imagen);

    res.json({ exito: true, mensaje: 'Producto eliminado definitivamente' });
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
