// API Service - Cliente para llamadas HTTP

let API_BASE = '';
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_BASE = 'http://localhost:3001/api';
} else {
    API_BASE = 'https://ecovida-backend.onrender.com/api';
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getImageUrl(ruta) {
  // 1. Si no hay ruta o es el default fallido, asegurar el placeholder para evitar 404
  if (!ruta || ruta.includes('producto-default.svg')) return 'https://placehold.co/400x400/e9ecef/6c757d?text=Sin+Imagen';
  
  if (ruta.startsWith('http')) return ruta;
  
  const partes = ruta.split('/');
  const nombreArchivo = partes[partes.length - 1];

  // 2. Si la imagen pertenece a la carpeta frontend/images/ o son datos de prueba (SVG)
  if (ruta.includes('images/') || ruta.includes('producto-')) {
    return `images/${nombreArchivo}`;
  }

  // 3. Imágenes nuevas subidas desde el Panel Admin van a la carpeta de tu servidor (Local o Render)
  const baseUrl = API_BASE.replace('/api', '');
  return `${baseUrl}/uploads/${nombreArchivo}`;
}

class APIService {
  static getImageUrl = getImageUrl;

  static getToken() {
    return localStorage.getItem('token');
  }

  static setToken(token) {
    localStorage.setItem('token', token);
  }

  static clearToken() {
    localStorage.removeItem('token');
  }

  static getHeaders(includeAuth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (includeAuth && this.getToken()) {
      headers.Authorization = `Bearer ${this.getToken()}`;
    }
    return headers;
  }

  // AUTH
  static async register(nombre, email, contrasena) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ nombre, email, contrasena })
    });
    return res.json();
  }

  static async login(email, contrasena) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ email, contrasena })
    });
    return res.json();
  }

  static logout() {
    this.clearToken();
  }

  // PRODUCTOS
  static async obtenerProductos() {
    const res = await fetch(`${API_BASE}/productos`, {
      headers: this.getHeaders(false)
    });
    return res.json();
  }

  static async obtenerProductoPorId(id) {
    const res = await fetch(`${API_BASE}/productos/${id}`, {
      headers: this.getHeaders(false)
    });
    return res.json();
  }

  static async obtenerProductosPorCategoria(categoriaId) {
    const res = await fetch(`${API_BASE}/productos/categoria/${categoriaId}`, {
      headers: this.getHeaders(false)
    });
    return res.json();
  }

  static async buscarProductos(termino) {
    const res = await fetch(`${API_BASE}/productos/buscar/${termino}`, {
      headers: this.getHeaders(false)
    });
    return res.json();
  }

  // CATEGORÍAS
  static async obtenerCategorias() {
    const res = await fetch(`${API_BASE}/categorias`, {
      headers: this.getHeaders(false)
    });
    return res.json();
  }

  static async obtenerCategoriaPorId(id) {
    const res = await fetch(`${API_BASE}/categorias/${id}`, {
      headers: this.getHeaders(false)
    });
    return res.json();
  }

  // CARRITO
  static async obtenerCarrito() {
    const res = await fetch(`${API_BASE}/carrito`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  static async agregarAlCarrito(productoId, cantidad) {
    const res = await fetch(`${API_BASE}/carrito`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ productoId, cantidad })
    });
    return res.json();
  }

  static async actualizarCarrito(productoId, cantidad) {
    const res = await fetch(`${API_BASE}/carrito/${productoId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ cantidad })
    });
    return res.json();
  }

  static async eliminarDelCarrito(productoId) {
    const res = await fetch(`${API_BASE}/carrito/${productoId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return res.json();
  }

  static async vaciarCarrito() {
    const res = await fetch(`${API_BASE}/carrito`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return res.json();
  }

  // ÓRDENES
  static async crearOrden(direccionEnvio) {
    const res = await fetch(`${API_BASE}/ordenes`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ direccionEnvio })
    });
    return res.json();
  }

  static async obtenerMisOrdenes() {
    const res = await fetch(`${API_BASE}/ordenes`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  static async obtenerOrdenPorId(id) {
    const res = await fetch(`${API_BASE}/ordenes/${id}`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  static async descargarFactura(id) {
    const token = this.getToken();
    if (!token) {
      window.location.href = 'login.html';
      return;
    }

    // 1. Obtener los datos completos de la orden
    const orden = await this.obtenerOrdenPorId(id);
    if (orden.error) throw new Error(orden.error);

    // 2. Inyectar dinámicamente jsPDF en el navegador si no existe
    if (!window.jspdf) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('No se pudo cargar el generador de PDF'));
        document.head.appendChild(script);
      });
    }

    // 3. Generar el PDF directamente en el frontend
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const date = new Date(orden.fechaCreacion);
    const year = date.getFullYear();
    const shortId = String(orden.id).padStart(8, '0');
    const invoiceNum = `ECO-${year}-${shortId}`;

    // Títulos y Membrete
    doc.setFontSize(22);
    doc.setTextColor(27, 67, 50); // Verde oscuro EcoVida
    doc.text("EcoVida", 14, 20);
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("COMPROBANTE DE COMPRA", 14, 30);

    // Datos de la orden
    doc.setFontSize(11);
    doc.text(`Número: ${invoiceNum}`, 14, 40);
    doc.text(`Fecha: ${date.toLocaleString('es-BO')}`, 14, 46);
    doc.setFont(undefined, 'bold');
    doc.text("Datos del Cliente:", 14, 56);
    doc.setFont(undefined, 'normal');
    doc.text(`Nombre: ${orden.nombre || 'Cliente General'}`, 14, 62);
    doc.text(`Email: ${orden.email || 'N/A'}`, 14, 68);
    doc.text(`Método de Pago: ${(orden.metodoPago || 'No especificado').toUpperCase()}`, 14, 74);

    // Tabla de productos
    doc.setFillColor(240, 240, 240);
    doc.rect(14, 82, 182, 8, 'F');
    doc.setFont(undefined, 'bold');
    doc.text("Producto", 16, 88);
    doc.text("Cant.", 130, 88);
    doc.text("Precio", 150, 88);
    doc.text("Subtotal", 175, 88);

    doc.setFont(undefined, 'normal');
    let y = 96;
    (orden.productos || []).forEach(p => {
      doc.text(String(p.nombre).substring(0, 45), 16, y);
      doc.text(String(p.cantidad), 130, y);
      doc.text(`Bs ${Number(p.precio).toFixed(2)}`, 150, y);
      doc.text(`Bs ${(p.cantidad * p.precio).toFixed(2)}`, 175, y);
      y += 8;
    });

    doc.setDrawColor(200, 200, 200);
    doc.line(14, y - 4, 196, y - 4);
    y += 4;

    // Total y Footer
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL PAGADO: Bs ${Number(orden.total).toFixed(2)}`, 130, y);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Nota: Factura fiscal disponible previa solicitud con NIT.", 14, y + 20);

    // 4. Forzar descarga local
    doc.save(`${invoiceNum}.pdf`);
  }

  // RESEÑAS
  static async obtenerResenasProducto(productoId) {
    const res = await fetch(`${API_BASE}/resenas/producto/${productoId}`, {
      headers: this.getHeaders(false)
    });
    return res.json();
  }

  static async crearResena(productoId, calificacion, comentario = '') {
    const res = await fetch(`${API_BASE}/resenas`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ productoId, calificacion, comentario })
    });
    return res.json();
  }

  static async obtenerMisResenas() {
    const res = await fetch(`${API_BASE}/resenas`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  static async obtenerTodasResenasAdmin() {
    const res = await fetch(`${API_BASE}/resenas`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  // USUARIO
  static async obtenerPerfil() {
    const res = await fetch(`${API_BASE}/users/perfil`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  static async actualizarPerfil(datos) {
    const res = await fetch(`${API_BASE}/users/perfil`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(datos)
    });
    return res.json();
  }

  // FAVORITOS
  static async obtenerFavoritos() {
    const res = await fetch(`${API_BASE}/favoritos`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  static async obtenerFavoritosIds() {
    const res = await fetch(`${API_BASE}/favoritos/ids`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  static async agregarFavorito(productoId) {
    const res = await fetch(`${API_BASE}/favoritos`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ productoId })
    });
    return res.json();
  }

  static async eliminarFavorito(productoId) {
    const res = await fetch(`${API_BASE}/favoritos/${productoId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return res.json();
  }

  // CONTACTO
  static async enviarContacto(datos) {
    const res = await fetch(`${API_BASE}/contacto`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify(datos)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al enviar el mensaje');
    }
    return data;
  }
}
