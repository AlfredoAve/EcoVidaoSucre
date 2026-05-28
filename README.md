# EcoVida
# 🌿 EcoVida - Tienda Online de Productos Naturales

## Descripción
EcoVida es una tienda online desarrollada desde cero para la venta de productos naturales y orgánicos. Permite a los usuarios registrarse, explorar productos, agregar al carrito y realizar compras de forma segura.

---

## 📋 Estructura del Proyecto

### Backend
```
backend/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── adminController.js
│   │   ├── authController.js
│   │   ├── carritoController.js
│   │   ├── categoriaController.js
│   │   ├── contactoController.js
│   │   ├── favoritosController.js
│   │   ├── ordenesController.js
│   │   ├── paypalController.js
│   │   ├── productosController.js
│   │   ├── resenasController.js
│   │   └── userController.js
│   ├── middleware/
│   │   ├── adminMiddleware.js
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── Carrito.js
│   │   ├── Categoria.js
│   │   ├── Orden.js
│   │   ├── Producto.js
│   │   ├── Resena.js
│   │   └── Usuario.js
│   ├── repositories/
│   │   ├── carritoRepository.js
│   │   ├── categoriaRepository.js
│   │   ├── favoritosRepository.js
│   │   ├── ordenesRepository.js
│   │   ├── productosRepository.js
│   │   ├── resenasRepository.js
│   │   └── userRepository.js
│   ├── services/
│   │   ├── authService.js
│   │   ├── checkoutService.js
│   │   ├── facturaService.js
│   │   └── paypalService.js
├── server.js
├── package.json
├── run-server.js
├── seed.js
└── .env
### Frontend
```
frontend/
├── index.html
├── productos.html
├── carrito.html
├── orden-confirmacion.html
├── profile.html
├── login.html
├── register.html
├── sobre-nosotros.html
├── contacto.html
├── categorias.html
├── panel-admin.html
├── terminos.html
├── privacidad.html
├── 404.html
├── test-login.html
├── _navbar.html
├── js/
│   ├── adminPanel.js
│   ├── apiService.js
│   ├── auth.js
│   ├── carritoManager.js
│   ├── checkoutManager.js
│   ├── header.js
│   ├── main.js
│   ├── navbarLoader.js
│   ├── notif.js
│   ├── productosFilter.js
│   ├── profile.js
│   └── socialFloat.js
├── CSS/
│   └── style.css
├── images/
├── robots.txt
└── sitemap.xml

## 🚀 Instalación y Uso

### 1. Clonar/Descargar el proyecto
```bash
cd ecovida/backend
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Iniciar el servidor
```bash
npm start
```
El servidor estará en: **http://localhost:3001**

### 4. Acceder a la aplicación
Abre en tu navegador: ****

También funciona: **http://localhost:3001/frontend/index.html** (redirige automáticamente)
---

## 🔧 Tecnologías Utilizadas

### Backend
- **Express.js** - Framework HTTP
- **SQLite3** - Base de datos
- **JWT** - Autenticación
- **bcryptjs** - Encriptación de contraseñas
- **MercadoPago** - Procesamiento de pagos

### Frontend
- **Bootstrap 5** - Diseño responsivo
- **Bootstrap Icons** - Iconos
- **Vanilla JavaScript** - Sin frameworks

---
http://localhost:3001/frontend/html/index.html
## 📚 Endpoints API

### Autenticación
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
```

### Productos
```
GET    /api/productos
GET    /api/productos/:id
GET    /api/productos/categoria/:id
GET    /api/productos/buscar/:termino
```

### Categorías
```
GET    /api/categorias
GET    /api/categorias/:id
```

### Carrito (con Auth)
```
GET    /api/carrito
POST   /api/carrito
PUT    /api/carrito/:productoId
DELETE /api/carrito/:productoId
```

### Órdenes (con Auth)
```
GET    /api/ordenes
GET    /api/ordenes/:id
POST   /api/ordenes
```

### Reseñas (con Auth)
```
GET    /api/resenas/producto/:id
POST   /api/resenas
GET    /api/resenas
```

### Usuario (con Auth)
```
GET    /api/users/perfil
PUT    /api/users/perfil
```

### Admin (con Auth + Admin)
```
GET    /api/admin/productos
POST   /api/admin/productos
PUT    /api/admin/productos/:id
DELETE /api/admin/productos/:id
```

---

## 🔐 Autenticación

EcoVida usa JWT (JSON Web Tokens) para autenticación:

1. **Registro**: Crea nueva cuenta
2. **Login**: Obtiene token JWT
3. **Token**: Se guarda en localStorage
4. **Rutas protegidas**: Requieren token en header `Authorization: Bearer <token>`

---

## 🛒 Flujo de Compra

1. **Explorar productos**
   - Ver catálogo filtrado por categoría
   - Buscar productos específicos
   - Ver detalles y reseñas

2. **Carrito**
   - Agregar productos
   - Modificar cantidades
   - Eliminar productos

3. **Checkout**
   - Confirmar dirección de envío
   - Ver resumen de compra
   - Realizar pago

4. **Confirmación**
   - Ver detalles de la orden
   - Número de seguimiento
   - Historial de compras

---

## 👤 Roles de Usuario

### Cliente
- Registrarse y crear cuenta
- Explorar productos
- Carrito de compras
- Realizar órdenes
- Ver historial de compras
- Escribir reseñas

### Admin
- Gestionar productos (crear, editar, eliminar)
- Gestionar categorías
- Ver todas las órdenes
- Actualizar estado de órdenes
- Ver estadísticas

---

## 📊 Base de Datos

Tablas principales:
- `usuarios` - Cuentas de usuarios
- `productos` - Catálogo de productos
- `categorias` - Categorías de productos
- `carrito` - Carrito de compras
- `ordenes` - Historial de órdenes
- `resenas` - Reseñas de productos
- `notificaciones` - Notificaciones del sistema

---

## 🎨 Personalización

### Logo y Colores
- Logo en: `frontend/images/logo.png`
- Colores en: `frontend/CSS/style.css` (variables CSS)

### Texto
- Busca "EcoVida" y reemplaza con tu marca
- Actualiza contacto en footer
- Personaliza sobre-nosotros.html

---

## 🚀 Deploy a Producción

1. Cambiar `API_BASE` en `apiService.js`
2. Configurar variables de entorno
3. Usar servidor seguro (HTTPS)
4. Configurar CORS
5. Respaldar base de datos

---

## 📝 Notas Importantes

- Las imágenes de productos se guardan como URLs
- MercadoPago requiere configuración con tokens reales
- El stock se valida antes de crear órdenes
- Las contraseñas se encriptan con bcryptjs

---

## 📞 Soporte

Para preguntas o reportar bugs:
- Email: contacto@ecovida.com
- Teléfono: +591 78451268

---

**© 2025 EcoVida - Todos los derechos reservados**
