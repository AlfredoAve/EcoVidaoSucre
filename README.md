# 🌿 EcoVida - Tienda Online de Productos Naturales

## Descripción
EcoVida es una tienda online desarrollada para la venta de productos naturales y orgánicos. Permite a los usuarios registrarse, explorar productos, agregar al carrito y realizar compras de forma segura, incluyendo generación de facturas y pasarelas de pago.

---

## 📋 Estructura del Proyecto

### Backend
```text
backend/
├── assets/                  # Recursos estáticos (ej. iconos para facturas)
├── facturas/                # Facturas generadas en PDF
├── src/
│   ├── config/              # Configuración (ej. base de datos)
│   ├── controllers/         # Lógica de manejo de rutas (Admin, Auth, Carrito, PayPal, etc.)
│   ├── middleware/          # Middlewares de Express (Auth, Admin)
│   ├── models/              # Modelos de datos (SQLite)
│   ├── repositories/        # Abstracción de acceso a datos
│   └── services/            # Lógica de negocio (Facturación, Checkout, Auth, PayPal)
├── uploads/                 # Archivos subidos por los usuarios (ej. imágenes de productos)
├── server.js                # Punto de entrada de la aplicación Express
├── run-server.js            # Script para iniciar/inicializar la DB
├── seed.js                  # Script para poblar la DB con datos iniciales
├── database.db              # Archivo de base de datos SQLite
├── package.json             # Dependencias del backend
└── .env                     # Variables de entorno
```

### Frontend
```text
frontend/
├── index.html               # Página de inicio
├── productos.html           # Catálogo de productos
├── carrito.html             # Carrito de compras
├── orden-confirmacion.html  # Confirmación de pedido
├── profile.html             # Perfil del usuario
├── login.html               # Inicio de sesión
├── register.html            # Registro de usuarios
├── panel-admin.html         # Panel de administración
├── sobre-nosotros.html      # Información sobre EcoVida
├── contacto.html            # Formulario de contacto
├── categorias.html          # Listado de categorías
├── terminos.html            # Términos y condiciones
├── privacidad.html          # Política de privacidad
├── _navbar.html             # Componente de navegación reusable
├── 404.html                 # Página de error 404
├── CSS/
│   └── style.css            # Hoja de estilos global
├── js/                      # Scripts funcionales (API, Carrito, Auth, Filtros, Notificaciones)
├── images/                  # Imágenes y logotipos
├── robots.txt               # Directivas para web crawlers
└── sitemap.xml              # Mapa del sitio para SEO
```

---

## 🚀 Instalación y Uso

### 1. Clonar/Descargar el proyecto
Abre tu terminal y navega a la carpeta del proyecto.
```bash
cd EcoVidaSucre/backend
```

### 2. Configurar Variables de Entorno
Copia el archivo `.env.example` (si existe) o crea un archivo `.env` en la carpeta `backend/` con la configuración necesaria (puertos, JWT secret, credenciales de PayPal/MercadoPago).

### 3. Instalar dependencias
```bash
npm install
```

### 4. Inicializar la Base de Datos
Si deseas poblar la base de datos con productos y categorías iniciales:
```bash
node seed.js
```

### 5. Iniciar el servidor
```bash
npm run dev
# o para producción: npm start
```
El servidor estará corriendo en: **http://localhost:3001**

### 6. Acceder a la aplicación
Abre en tu navegador: **http://localhost:3001** (El backend sirve los archivos estáticos de la carpeta frontend automáticamente).

---

## 🔧 Tecnologías Utilizadas

### Backend
- **Node.js & Express.js** - Entorno y Framework HTTP
- **SQLite3** - Base de datos ligera y relacional
- **JWT (JSON Web Tokens)** - Autenticación
- **bcryptjs** - Encriptación de contraseñas
- **PDFKit** - Generación de facturas en PDF
- **Multer** - Subida de archivos (imágenes de productos)
- **PayPal / MercadoPago** - Procesamiento de pagos (dependiendo de la configuración)

### Frontend
- **HTML5 & CSS3** - Estructura y diseño
- **Vanilla JavaScript** - Interactividad dinámica sin frameworks pesados
- **Bootstrap 5** - Diseño responsivo y componentes de UI
- **Bootstrap Icons** - Sistema de iconos

---

## 📚 Endpoints API Principales

- **Autenticación:** `/api/auth/register`, `/api/auth/login`
- **Productos:** `/api/productos`, `/api/productos/:id`, `/api/productos/categoria/:id`
- **Categorías:** `/api/categorias`
- **Carrito:** `/api/carrito` (Requiere Auth)
- **Órdenes:** `/api/ordenes` (Requiere Auth)
- **Reseñas:** `/api/resenas`
- **Usuario:** `/api/users/perfil` (Requiere Auth)
- **Administrador:** `/api/admin/productos` (Requiere Auth + Rol Admin)
- **Pagos (PayPal):** `/api/paypal/create-order`, `/api/paypal/capture-order`

*(Todos los endpoints consumen y producen JSON).*

---

## 🔐 Autenticación

EcoVida usa JWT (JSON Web Tokens) para autenticación:
1. **Registro/Login**: Al iniciar sesión o registrarse, el servidor retorna un token JWT.
2. **Almacenamiento**: El token se guarda localmente en `localStorage`.
3. **Rutas protegidas**: El frontend envía el token en el header `Authorization: Bearer <token>` para acceder a recursos protegidos.

---

## 🛒 Flujo de Compra

1. **Explorar productos:** Ver catálogo, filtrar por categoría, buscar, y leer reseñas.
2. **Carrito:** Agregar productos, modificar cantidades y ver el subtotal.
3. **Checkout:** Confirmar dirección, método de pago, y generar la orden.
4. **Pago y Facturación:** Completar el pago con la pasarela integrada y recibir la factura en PDF.
5. **Confirmación:** Ver número de seguimiento e historial en el panel de perfil.

---

## 👤 Roles de Usuario

- **Cliente:** Puede registrarse, explorar productos, comprar, ver historial y escribir reseñas.
- **Admin:** Puede gestionar productos y categorías, ver órdenes de todos los usuarios y gestionar la plataforma desde `panel-admin.html`.

---

## 📊 Base de Datos (SQLite)

Tablas principales:
- `usuarios` - Cuentas y roles (cliente/admin)
- `productos` - Catálogo (precios, stock, imágenes)
- `categorias` - Categorización de inventario
- `carrito` - Items agregados por el usuario temporalmente
- `ordenes` - Historial de compras finalizadas
- `resenas` - Puntuaciones y opiniones
- `favoritos` - Lista de deseos de los usuarios

---

## 📞 Soporte

Para preguntas o reportar bugs:
- **Email:** contacto@ecovida.com
- **Teléfono:** +591 78451268

---

**© 2026 EcoVida - Todos los derechos reservados**
