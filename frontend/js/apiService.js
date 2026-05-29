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
    const res = await fetch(`${API_BASE}/ordenes/${id}/factura`, {
      headers: this.getHeaders()
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Error al descargar la factura');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
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
