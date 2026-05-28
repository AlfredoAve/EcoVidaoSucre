// Admin Panel - CRUD completo

let productoEditando = null;
let categoriaEditando = null;
let todosProductos    = [];
let todasCategorias   = [];
let productosDB       = [];
let categoriasDB      = [];
let usuariosDB        = [];
let todasOrdenes      = [];
let ordenPendienteEstado = null;
let pendingConfirmFn  = null;

document.addEventListener('DOMContentLoaded', async () => {
  const token   = APIService.getToken();
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

  if (!token || usuario?.rol !== 'admin') {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('adminName').textContent = usuario.nombre;

  await Promise.all([
    cargarCategorias(),
    cargarProductos(),
    cargarEstadisticas(),
    cargarOrdenes()
  ]);

  configurarEventos();
});

// ─── TOAST ────────────────────────────────────────────────────────────────────
function mostrarToast(mensaje, tipo = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const id  = `t${Date.now()}`;
  const bg  = tipo === 'error' ? 'bg-danger' : tipo === 'warning' ? 'bg-warning' : 'bg-success';
  const ico = tipo === 'error' ? 'x-circle'  : tipo === 'warning' ? 'exclamation-triangle' : 'check-circle';
  container.insertAdjacentHTML('beforeend', `
    <div id="${id}" class="toast align-items-center text-white ${bg} border-0 mb-2" role="alert">
      <div class="d-flex">
        <div class="toast-body"><i class="bi bi-${ico} me-2"></i>${mensaje}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`);
  const el = document.getElementById(id);
  const t  = new bootstrap.Toast(el, { delay: 3500 });
  t.show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}

// ─── MODAL CONFIRMACIÓN GENÉRICO ──────────────────────────────────────────────
function confirmar(mensaje, onConfirm) {
  document.getElementById('genericConfirmMessage').textContent = mensaje;
  pendingConfirmFn = onConfirm;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('genericConfirmModal')).show();
}

// ─── EVENTOS ──────────────────────────────────────────────────────────────────
function configurarEventos() {
  document.querySelectorAll('.tab-link').forEach(link => {
    link.addEventListener('click', e => { e.preventDefault(); cambiarTab(link.dataset.tab); });
  });

  document.getElementById('newProductBtn')?.addEventListener('click', abrirNuevoProducto);
  document.getElementById('newCategoryBtn')?.addEventListener('click', abrirNuevaCategoria);
  document.getElementById('productForm')?.addEventListener('submit', guardarProducto);
  document.getElementById('categoryForm')?.addEventListener('submit', guardarCategoria);
  document.getElementById('reloadDbBtn')?.addEventListener('click', cargarBaseDatos);
  document.getElementById('logoutBtn')?.addEventListener('click', logout);

  document.getElementById('genericConfirmActionBtn')?.addEventListener('click', async () => {
    if (!pendingConfirmFn) return;
    bootstrap.Modal.getInstance(document.getElementById('genericConfirmModal'))?.hide();
    await pendingConfirmFn();
    pendingConfirmFn = null;
  });

  document.getElementById('confirmOrderActionBtn')?.addEventListener('click', async () => {
    if (!ordenPendienteEstado) return;
    await cambiarEstadoOrden(ordenPendienteEstado.ordenId, ordenPendienteEstado.estado);
    bootstrap.Modal.getInstance(document.getElementById('confirmOrderModal'))?.hide();
    ordenPendienteEstado = null;
  });

  document.getElementById('completeOrderActionBtn')?.addEventListener('click', async () => {
    if (!ordenPendienteEstado) return;
    await cambiarEstadoOrden(ordenPendienteEstado.ordenId, ordenPendienteEstado.estado);
    bootstrap.Modal.getInstance(document.getElementById('completeOrderModal'))?.hide();
    ordenPendienteEstado = null;
  });

  document.getElementById('shippedOrderActionBtn')?.addEventListener('click', async () => {
    if (!ordenPendienteEstado) return;
    await cambiarEstadoOrden(ordenPendienteEstado.ordenId, ordenPendienteEstado.estado);
    bootstrap.Modal.getInstance(document.getElementById('shippedOrderModal'))?.hide();
    ordenPendienteEstado = null;
  });

  document.getElementById('deliveredOrderActionBtn')?.addEventListener('click', async () => {
    if (!ordenPendienteEstado) return;
    await cambiarEstadoOrden(ordenPendienteEstado.ordenId, ordenPendienteEstado.estado);
    bootstrap.Modal.getInstance(document.getElementById('deliveredOrderModal'))?.hide();
    ordenPendienteEstado = null;
  });

  document.getElementById('reloadMensajesBtn')?.addEventListener('click', cargarMensajes);
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
function cambiarTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.getElementById(`${tabName}-tab`).style.display = 'block';
  document.querySelectorAll('.tab-link').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  if (tabName === 'ordenes')   { cargarOrdenes(); cargarEstadisticas(); }
  if (tabName === 'usuarios')  cargarUsuarios();
  if (tabName === 'dashboard') cargarEstadisticas();
  if (tabName === 'base-datos') cargarBaseDatos();
  if (tabName === 'mensajes')  cargarMensajes();
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function setBtnLoading(btn, loading) {
  if (loading) {
    btn.disabled = true;
    btn._orig = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Guardando...';
  } else {
    btn.disabled = false;
    btn.innerHTML = btn._orig || 'Guardar';
  }
}

function esActivo(valor) {
  return valor === 1 || valor === true;
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: APIService.getHeaders()
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error(`apiFetch ${path} recibió respuesta no-JSON (HTTP ${res.status}):`, text.slice(0, 200));
    return { error: `Error HTTP ${res.status}` };
  }
}

async function subirImagen(file) {
  const formData = new FormData();
  formData.append('imagen', file);

  const headers = {};
  const token = APIService.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/admin/upload`, {
    method: 'POST',
    headers,
    body: formData
  });

  const data = await res.json();
  if (!res.ok || data?.error) {
    throw new Error(data?.error || 'Error al subir imagen');
  }

  return data.url;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTOS
// ═══════════════════════════════════════════════════════════════════════════════
async function cargarProductos() {
  try {
    todosProductos = await APIService.obtenerProductos();
    renderizarTablaProductos();
  } catch (e) {
    console.error('Error cargando productos:', e);
  }
}

function renderizarTablaProductos() {
  const tbody = document.getElementById('productosTableBody');
  if (!todosProductos.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No hay productos</td></tr>';
    return;
  }
  tbody.innerHTML = todosProductos.map(prod => {
    const catNombre = todasCategorias.find(c => c.id === prod.categoriaId)?.nombre || `#${prod.categoriaId}`;
    const stockBadge = prod.stock > 5 ? 'bg-success' : prod.stock > 0 ? 'bg-warning text-dark' : 'bg-danger';
    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            ${prod.imagen
              ? `<img src="${APIService.getImageUrl(prod.imagen)}" style="width:38px;height:38px;object-fit:cover;border-radius:6px;" alt="" onerror="this.src='https://placehold.co/400x400/e9ecef/6c757d?text=Sin+Imagen';this.onerror=null;">`
              : `<div style="width:38px;height:38px;background:#e9ecef;border-radius:6px;"></div>`}
            <strong>${escapeHtml(prod.nombre)}</strong>
          </div>
        </td>
        <td><span class="badge bg-secondary">${escapeHtml(catNombre)}</span></td>
        <td>$${prod.precio.toFixed(2)}</td>
        <td><span class="badge ${stockBadge}">${prod.stock}</span></td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-outline-warning" onclick="abrirEditarProducto(${prod.id})" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="confirmarEliminarProducto(${prod.id})" title="Eliminar">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function poblarSelectCategorias(selectedId = null) {
  const select = document.getElementById('prodCategoria');
  select.innerHTML = '<option value="">Seleccionar categoría...</option>';
  todasCategorias.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.nombre;
    if (selectedId !== null && cat.id === Number(selectedId)) opt.selected = true;
    select.appendChild(opt);
  });
}

function abrirNuevoProducto() {
  productoEditando = null;
  document.getElementById('productForm').reset();
  document.getElementById('prodImagenFile').value = '';
  document.getElementById('prodImagenUrl').value = '';
  document.getElementById('productModalTitle').textContent = 'Nuevo Producto';
  poblarSelectCategorias();
  bootstrap.Modal.getOrCreateInstance(document.getElementById('productModal')).show();
}

function abrirEditarProducto(productoId) {
  const prod = todosProductos.find(p => p.id === productoId) || productosDB.find(p => p.id === productoId);
  if (!prod) return;

  productoEditando = prod;
  document.getElementById('productModalTitle').textContent = 'Editar Producto';
  document.getElementById('prodNombre').value  = prod.nombre;
  document.getElementById('prodDesc').value    = prod.descripcion || '';
  document.getElementById('prodPrecio').value  = prod.precio;
  document.getElementById('prodStock').value   = prod.stock;
  document.getElementById('prodImagenFile').value = '';
  document.getElementById('prodImagenUrl').value = prod.imagen || '';
  poblarSelectCategorias(prod.categoriaId);

  bootstrap.Modal.getOrCreateInstance(document.getElementById('productModal')).show();
}

async function guardarProducto(e) {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  setBtnLoading(btn, true);

  const imagenFile = document.getElementById('prodImagenFile').files[0];
  const imagenUrl = document.getElementById('prodImagenUrl').value.trim();
  let imagen = productoEditando?.imagen || '';

  const datos = {
    nombre:      document.getElementById('prodNombre').value.trim(),
    descripcion: document.getElementById('prodDesc').value.trim(),
    precio:      parseFloat(document.getElementById('prodPrecio').value),
    stock:       parseInt(document.getElementById('prodStock').value),
    categoriaId: parseInt(document.getElementById('prodCategoria').value),
    imagen:      ''
  };

  try {
    if (imagenFile) {
      imagen = await subirImagen(imagenFile);
    } else if (imagenUrl) {
      imagen = imagenUrl;
    }
    datos.imagen = imagen;

    const path   = productoEditando ? `/admin/productos/${productoEditando.id}` : '/admin/productos';
    const method = productoEditando ? 'PUT' : 'POST';
    const result = await apiFetch(path, { method, body: JSON.stringify(datos) });

    if (result.error) { mostrarToast(result.error, 'error'); return; }

    bootstrap.Modal.getInstance(document.getElementById('productModal'))?.hide();
    mostrarToast(productoEditando ? 'Producto actualizado correctamente' : 'Producto creado correctamente');
    await cargarProductos();
  } catch (err) {
    mostrarToast(err?.message || 'Error al guardar el producto', 'error');
    console.error(err);
  } finally {
    setBtnLoading(btn, false);
  }
}

function confirmarEliminarProducto(productoId) {
  const prod = todosProductos.find(p => p.id === productoId) || productosDB.find(p => p.id === productoId);
  confirmar(`¿Eliminar "${prod?.nombre || 'este producto'}"? No se puede deshacer.`, async () => {
    try {
      const result = await apiFetch(`/admin/productos/${productoId}`, { method: 'DELETE' });
      if (result.error) { mostrarToast(result.error, 'error'); return; }
      mostrarToast('Producto eliminado');
      await cargarProductos();
      await cargarBaseDatos();
    } catch (err) {
      mostrarToast('Error al eliminar el producto', 'error');
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORÍAS
// ═══════════════════════════════════════════════════════════════════════════════
async function cargarCategorias() {
  try {
    todasCategorias = await APIService.obtenerCategorias();
    renderizarTablaCategorias();
  } catch (e) {
    console.error('Error cargando categorías:', e);
  }
}

function renderizarTablaCategorias() {
  const tbody = document.getElementById('categoriasTableBody');
  if (!todasCategorias.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No hay categorías</td></tr>';
    return;
  }
  tbody.innerHTML = todasCategorias.map(cat => `
    <tr>
      <td><strong>${escapeHtml(cat.nombre)}</strong></td>
      <td>${escapeHtml(cat.descripcion || '-')}</td>
      <td><span class="badge bg-info text-dark">${cat.productosCount || 0}</span></td>
      <td><span class="badge ${cat.activa !== false ? 'bg-success' : 'bg-secondary'}">${cat.activa !== false ? 'Activa' : 'Inactiva'}</span></td>
      <td>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-outline-warning" onclick="abrirEditarCategoria(${cat.id})" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="confirmarEliminarCategoria(${cat.id})" title="Eliminar">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>`).join('');
}

function abrirNuevaCategoria() {
  categoriaEditando = null;
  document.getElementById('categoryForm').reset();
  document.getElementById('catImagenFile').value = '';
  document.getElementById('catImagenUrl').value = '';
  document.getElementById('categoryModalTitle').textContent = 'Nueva Categoría';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('categoryModal')).show();
}

function abrirEditarCategoria(categoriaId) {
  const cat = todasCategorias.find(c => c.id === categoriaId) || categoriasDB.find(c => c.id === categoriaId);
  if (!cat) return;

  categoriaEditando = cat;
  document.getElementById('categoryModalTitle').textContent = 'Editar Categoría';
  document.getElementById('catNombre').value = cat.nombre;
  document.getElementById('catDesc').value   = cat.descripcion || '';
  document.getElementById('catImagenFile').value = '';
  document.getElementById('catImagenUrl').value = cat.imagen || '';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('categoryModal')).show();
}

async function guardarCategoria(e) {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  setBtnLoading(btn, true);

  const imagenFile = document.getElementById('catImagenFile').files[0];
  const imagenUrl = document.getElementById('catImagenUrl').value.trim();
  let imagen = categoriaEditando?.imagen || '';

  const datos = {
    nombre:      document.getElementById('catNombre').value.trim(),
    descripcion: document.getElementById('catDesc').value.trim(),
    imagen:      ''
  };

  try {
    if (imagenFile) {
      imagen = await subirImagen(imagenFile);
    } else if (imagenUrl) {
      imagen = imagenUrl;
    }
    datos.imagen = imagen;

    const path   = categoriaEditando ? `/categorias/${categoriaEditando.id}` : '/categorias';
    const method = categoriaEditando ? 'PUT' : 'POST';
    const result = await apiFetch(path, { method, body: JSON.stringify(datos) });

    if (result.error) { mostrarToast(result.error, 'error'); return; }

    bootstrap.Modal.getInstance(document.getElementById('categoryModal'))?.hide();
    mostrarToast(categoriaEditando ? 'Categoría actualizada' : 'Categoría creada');
    await cargarCategorias();
    await cargarProductos(); // actualiza nombres en tabla de productos
  } catch (err) {
    mostrarToast(err?.message || 'Error al guardar la categoría', 'error');
    console.error(err);
  } finally {
    setBtnLoading(btn, false);
  }
}

function confirmarEliminarCategoria(categoriaId) {
  const cat = todasCategorias.find(c => c.id === categoriaId) || categoriasDB.find(c => c.id === categoriaId);
  confirmar(`¿Eliminar la categoría "${cat?.nombre || 'esta categoría'}"? Los productos asociados quedarán sin categoría.`, async () => {
    try {
      const result = await apiFetch(`/categorias/${categoriaId}`, { method: 'DELETE' });
      if (result.error) { mostrarToast(result.error, 'error'); return; }
      mostrarToast('Categoría eliminada');
      await cargarCategorias();
      await cargarBaseDatos();
    } catch (err) {
      mostrarToast('Error al eliminar la categoría', 'error');
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// BASE DE DATOS
// ═══════════════════════════════════════════════════════════════════════════════
async function cargarBaseDatos() {
  const prodBody = document.getElementById('dbProductosTableBody');
  const catBody = document.getElementById('dbCategoriasTableBody');
  const userBody = document.getElementById('dbUsuariosTableBody');
  if (!prodBody || !catBody || !userBody) return;

  prodBody.innerHTML = '<tr><td colspan="4" class="text-center py-3"><span class="spinner-border spinner-border-sm me-2"></span>Cargando...</td></tr>';
  catBody.innerHTML = '<tr><td colspan="4" class="text-center py-3"><span class="spinner-border spinner-border-sm me-2"></span>Cargando...</td></tr>';
  userBody.innerHTML = '<tr><td colspan="5" class="text-center py-3"><span class="spinner-border spinner-border-sm me-2"></span>Cargando...</td></tr>';

  try {
    const [productos, categorias, usuarios] = await Promise.all([
      apiFetch('/admin/productos'),
      apiFetch('/categorias/admin/todas'),
      apiFetch('/users')
    ]);

    productosDB = Array.isArray(productos) ? productos : [];
    categoriasDB = Array.isArray(categorias) ? categorias : [];
    usuariosDB = Array.isArray(usuarios) ? usuarios : [];

    renderResumenBaseDatos();
    renderTablaBaseProductos();
    renderTablaBaseCategorias();
    renderTablaBaseUsuarios();
  } catch (e) {
    prodBody.innerHTML = '<tr><td colspan="4" class="text-danger text-center py-3">Error al cargar productos</td></tr>';
    catBody.innerHTML = '<tr><td colspan="4" class="text-danger text-center py-3">Error al cargar categorías</td></tr>';
    userBody.innerHTML = '<tr><td colspan="5" class="text-danger text-center py-3">Error al cargar usuarios</td></tr>';
  }
}

function renderResumenBaseDatos() {
  const prodActivos = productosDB.filter(p => esActivo(p.activo)).length;
  const catActivas = categoriasDB.filter(c => esActivo(c.activa)).length;
  const userActivos = usuariosDB.filter(u => esActivo(u.activo)).length;

  document.getElementById('dbProductosTotal').textContent = productosDB.length;
  document.getElementById('dbProductosActivos').textContent = prodActivos;
  document.getElementById('dbProductosInactivos').textContent = productosDB.length - prodActivos;

  document.getElementById('dbCategoriasTotal').textContent = categoriasDB.length;
  document.getElementById('dbCategoriasActivas').textContent = catActivas;
  document.getElementById('dbCategoriasInactivas').textContent = categoriasDB.length - catActivas;

  document.getElementById('dbUsuariosTotal').textContent = usuariosDB.length;
  document.getElementById('dbUsuariosActivos').textContent = userActivos;
  document.getElementById('dbUsuariosInactivos').textContent = usuariosDB.length - userActivos;
}

function renderTablaBaseProductos() {
  const tbody = document.getElementById('dbProductosTableBody');
  if (!productosDB.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-muted text-center py-3">No hay productos</td></tr>';
    return;
  }

  tbody.innerHTML = productosDB.map(prod => {
    const activo = esActivo(prod.activo);
    const badge = activo ? 'bg-success' : 'bg-secondary';
    return `
      <tr>
        <td>${prod.id}</td>
        <td>${escapeHtml(prod.nombre)}</td>
        <td><span class="badge ${badge}">${activo ? 'Activo' : 'Inactivo'}</span></td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-outline-warning" onclick="abrirEditarProducto(${prod.id})" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            ${!activo ? `
              <button class="btn btn-sm btn-outline-success" onclick="activarProducto(${prod.id})" title="Activar">
                <i class="bi bi-check2-circle"></i>
              </button>` : ''}
            <button class="btn btn-sm btn-outline-danger" onclick="confirmarEliminarProducto(${prod.id})" title="Eliminar" ${!activo ? 'disabled' : ''}>
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function renderTablaBaseCategorias() {
  const tbody = document.getElementById('dbCategoriasTableBody');
  if (!categoriasDB.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-muted text-center py-3">No hay categorías</td></tr>';
    return;
  }

  tbody.innerHTML = categoriasDB.map(cat => {
    const activa = esActivo(cat.activa);
    const badge = activa ? 'bg-success' : 'bg-secondary';
    return `
      <tr>
        <td>${cat.id}</td>
        <td>${escapeHtml(cat.nombre)}</td>
        <td><span class="badge ${badge}">${activa ? 'Activa' : 'Inactiva'}</span></td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-outline-warning" onclick="abrirEditarCategoria(${cat.id})" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            ${!activa ? `
              <button class="btn btn-sm btn-outline-success" onclick="activarCategoria(${cat.id})" title="Activar">
                <i class="bi bi-check2-circle"></i>
              </button>` : ''}
            <button class="btn btn-sm btn-outline-danger" onclick="confirmarEliminarCategoria(${cat.id})" title="Eliminar" ${!activa ? 'disabled' : ''}>
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function renderTablaBaseUsuarios() {
  const tbody = document.getElementById('dbUsuariosTableBody');
  if (!usuariosDB.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-muted text-center py-3">No hay usuarios</td></tr>';
    return;
  }

  tbody.innerHTML = usuariosDB.map(user => {
    const activo = esActivo(user.activo);
    const badge = activo ? 'bg-success' : 'bg-secondary';
    return `
      <tr>
        <td>${user.id}</td>
        <td>${escapeHtml(user.nombre || '')}</td>
        <td>${escapeHtml(user.email || '')}</td>
        <td><span class="badge ${user.rol === 'admin' ? 'bg-danger' : 'bg-primary'}">${user.rol || '-'}</span></td>
        <td><span class="badge ${badge}">${activo ? 'Activo' : 'Inactivo'}</span></td>
      </tr>`;
  }).join('');
}

async function activarProducto(productoId) {
  try {
    const result = await apiFetch(`/admin/productos/${productoId}`, {
      method: 'PUT',
      body: JSON.stringify({ activo: 1 })
    });
    if (result.error) { mostrarToast(result.error, 'error'); return; }
    mostrarToast('Producto activado');
    await cargarProductos();
    await cargarBaseDatos();
  } catch (e) {
    mostrarToast('Error al activar el producto', 'error');
  }
}

async function activarCategoria(categoriaId) {
  try {
    const result = await apiFetch(`/categorias/${categoriaId}`, {
      method: 'PUT',
      body: JSON.stringify({ activa: 1 })
    });
    if (result.error) { mostrarToast(result.error, 'error'); return; }
    mostrarToast('Categoría activada');
    await cargarCategorias();
    await cargarBaseDatos();
  } catch (e) {
    mostrarToast('Error al activar la categoría', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADÍSTICAS
// ═══════════════════════════════════════════════════════════════════════════════
async function cargarEstadisticas() {
  try {
    const stats = await apiFetch('/ordenes/admin/estadisticas');
    document.getElementById('totalOrdenes').textContent  = stats.totalOrdenes  || 0;
    document.getElementById('ingresoTotal').textContent  = (stats.ingresoTotal || 0).toFixed(2);
    document.getElementById('completadas').textContent   = stats.completadas   || 0;
    document.getElementById('pendientes').textContent    = stats.pendientes    || 0;
  } catch (e) {
    console.error('Error cargando estadísticas:', e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ÓRDENES
// ═══════════════════════════════════════════════════════════════════════════════
async function cargarOrdenes() {
  const tbody = document.getElementById('ordenesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3"><span class="spinner-border spinner-border-sm me-2"></span>Cargando...</td></tr>';

  try {
    const ordenes = await apiFetch('/ordenes/admin/todas');
    if (ordenes?.error) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center py-3">${ordenes.error}</td></tr>`;
      return;
    }
    todasOrdenes = Array.isArray(ordenes) ? ordenes : [];
    renderizarTablaOrdenes();
  } catch (e) {
    console.error('Error cargando órdenes:', e);
    tbody.innerHTML = '<tr><td colspan="6" class="text-danger text-center py-3">Error al cargar órdenes</td></tr>';
  }
}

function renderizarTablaOrdenes() {
  const tbody = document.getElementById('ordenesTableBody');
  if (!todasOrdenes.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-muted text-center py-4">No hay órdenes registradas</td></tr>';
    return;
  }

  tbody.innerHTML = todasOrdenes.map(orden => {
    const badges = {
      completada: 'bg-success',
      confirmada: 'bg-info text-dark',
      cancelada:  'bg-danger',
      pendiente:  'bg-warning text-dark',
      enviado:    'bg-primary',
      entregado:  'bg-success'
    };
    const clsBadge      = badges[orden.estado] || 'bg-warning text-dark';
    const fecha         = new Date(orden.fechaCreacion).toLocaleString('es-ES');
    const esConfirmable = orden.estado === 'pendiente';
    const esEnviable    = orden.estado === 'confirmada';
    const esEntregable  = orden.estado === 'enviado';
    const esCancelable  = orden.estado === 'pendiente' || orden.estado === 'confirmada';

    return `
      <tr>
        <td><strong>#${orden.id}</strong></td>
        <td>
          ${escapeHtml(orden.nombre || 'Cliente')}<br>
          <small class="text-muted">${escapeHtml(orden.email || '')}</small>
        </td>
        <td>$${Number(orden.total || 0).toFixed(2)}</td>
        <td><span class="badge ${clsBadge}">${orden.estado || 'pendiente'}</span></td>
        <td><small>${fecha}</small></td>
        <td>
          <div class="d-flex gap-1 flex-wrap">
            <button class="btn btn-sm btn-outline-primary" onclick="verDetalleOrden(${orden.id})" title="Ver detalle">
              <i class="bi bi-eye"></i>
            </button>
            ${esConfirmable ? `<button class="btn btn-sm btn-outline-success" onclick="abrirModalConfirmarOrden(${orden.id})" title="Confirmar"><i class="bi bi-check-lg"></i></button>` : ''}
            ${esEnviable    ? `<button class="btn btn-sm btn-outline-primary" onclick="abrirModalEnviarOrden(${orden.id})"    title="Marcar enviada"><i class="bi bi-truck"></i></button>` : ''}
            ${esEntregable  ? `<button class="btn btn-sm btn-outline-success" onclick="abrirModalEntregarOrden(${orden.id})"  title="Marcar entregada"><i class="bi bi-check2-all"></i></button>` : ''}
            ${esCancelable  ? `<button class="btn btn-sm btn-outline-danger"  onclick="confirmarCancelarOrden(${orden.id})"   title="Cancelar"><i class="bi bi-x-lg"></i></button>` : ''}
          </div>
        </td>
      </tr>`;
  }).join('');
}

function verDetalleOrden(ordenId) {
  const orden = todasOrdenes.find(o => o.id === ordenId);
  if (!orden) return;

  const productos = Array.isArray(orden.productos) ? orden.productos : [];
  document.getElementById('orderDetailTitle').textContent   = `Orden #${orden.id}`;
  document.getElementById('orderDetailClient').textContent  = orden.nombre    || 'Cliente';
  document.getElementById('orderDetailEmail').textContent   = orden.email     || '-';
  document.getElementById('orderDetailAddress').textContent = orden.direccionEnvio || 'Sin dirección';

  const tbody = document.getElementById('orderDetailProductsBody');
  tbody.innerHTML = productos.length
    ? productos.map((p, i) => {
        const precio   = Number(p.precio || 0);
        const cantidad = Number(p.cantidad || 0);
        return `<tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(p.nombre || 'Producto')}</td>
          <td>${cantidad}</td>
          <td>$${precio.toFixed(2)}</td>
          <td>$${(precio * cantidad).toFixed(2)}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="5" class="text-muted text-center py-3">Sin productos</td></tr>';

  document.getElementById('orderDetailTotal').textContent = `$${Number(orden.total || 0).toFixed(2)}`;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('orderDetailModal')).show();
}

function abrirModalConfirmarOrden(ordenId) {
  const orden = todasOrdenes.find(o => o.id === ordenId);
  if (!orden) return;
  ordenPendienteEstado = { ordenId, estado: 'confirmada' };
  document.getElementById('confirmOrderMessage').textContent = `¿Confirmar la orden #${ordenId} de ${orden.nombre || 'cliente'}?`;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmOrderModal')).show();
}

function abrirModalCompletarOrden(ordenId) {
  const orden = todasOrdenes.find(o => o.id === ordenId);
  if (!orden) return;
  ordenPendienteEstado = { ordenId, estado: 'completada' };
  document.getElementById('completeOrderMessage').textContent = `¿Marcar como completada la orden #${ordenId}?`;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('completeOrderModal')).show();
}

function confirmarCancelarOrden(ordenId) {
  const orden = todasOrdenes.find(o => o.id === ordenId);
  confirmar(`¿Cancelar la orden #${ordenId} de ${orden?.nombre || 'cliente'}?`, () =>
    cambiarEstadoOrden(ordenId, 'cancelada')
  );
}

async function cambiarEstadoOrden(ordenId, estado) {
  try {
    const result = await apiFetch(`/ordenes/${ordenId}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado })
    });
    if (result.error) { mostrarToast(result.error, 'error'); return; }
    mostrarToast(`Orden #${ordenId} → ${estado}`);
    await cargarOrdenes();
    await cargarEstadisticas();
  } catch (e) {
    mostrarToast('Error al actualizar estado de la orden', 'error');
    console.error(e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// USUARIOS
// ═══════════════════════════════════════════════════════════════════════════════
async function cargarUsuarios() {
  const tbody = document.getElementById('usuariosTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3"><span class="spinner-border spinner-border-sm me-2"></span>Cargando...</td></tr>';

  try {
    const usuarios = await apiFetch('/users');

    if (usuarios?.error || !Array.isArray(usuarios)) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-muted text-center py-4">${usuarios?.error || 'Endpoint no disponible'}</td></tr>`;
      return;
    }

    if (!usuarios.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-muted text-center py-4">No hay usuarios</td></tr>';
      return;
    }

    tbody.innerHTML = usuarios.map(u => `
      <tr>
        <td><strong>${escapeHtml(u.nombre)}</strong></td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="badge ${u.rol === 'admin' ? 'bg-danger' : 'bg-primary'}">${u.rol}</span></td>
        <td><span class="badge ${u.activo !== false ? 'bg-success' : 'bg-secondary'}">${u.activo !== false ? 'Activo' : 'Inactivo'}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-danger"
            onclick="confirmarEliminarUsuario(${u.id}, '${escapeHtml(u.nombre)}')"
            title="Eliminar"
            ${u.rol === 'admin' ? 'disabled title="No se puede eliminar un admin"' : ''}>
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>`).join('');
  } catch (e) {
    console.error('Error cargando usuarios:', e);
    tbody.innerHTML = '<tr><td colspan="5" class="text-danger text-center py-3">Error al cargar usuarios</td></tr>';
  }
}

function confirmarEliminarUsuario(usuarioId, nombre) {
  confirmar(`¿Desactivar al usuario "${nombre}"?`, async () => {
    try {
      const result = await apiFetch(`/users/${usuarioId}/desactivar`, { method: 'PUT' });
      if (result.error) { mostrarToast(result.error, 'error'); return; }
      mostrarToast('Usuario desactivado');
      await cargarUsuarios();
    } catch (e) {
      mostrarToast('Error al desactivar el usuario', 'error');
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADOS ADICIONALES — ENVIADO / ENTREGADO
// ═══════════════════════════════════════════════════════════════════════════════
function abrirModalEnviarOrden(ordenId) {
  const orden = todasOrdenes.find(o => o.id === ordenId);
  if (!orden) return;
  ordenPendienteEstado = { ordenId, estado: 'enviado' };
  document.getElementById('shippedOrderMessage').textContent =
    `¿Marcar la orden #${ordenId} de ${orden.nombre || 'cliente'} como enviada?`;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('shippedOrderModal')).show();
}

function abrirModalEntregarOrden(ordenId) {
  const orden = todasOrdenes.find(o => o.id === ordenId);
  if (!orden) return;
  ordenPendienteEstado = { ordenId, estado: 'entregado' };
  document.getElementById('deliveredOrderMessage').textContent =
    `¿Marcar la orden #${ordenId} de ${orden.nombre || 'cliente'} como entregada?`;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('deliveredOrderModal')).show();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MENSAJES DE CONTACTO
// ═══════════════════════════════════════════════════════════════════════════════
async function cargarMensajes() {
  const tbody = document.getElementById('mensajesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3"><span class="spinner-border spinner-border-sm me-2"></span>Cargando...</td></tr>';

  try {
    const mensajes = await apiFetch('/contacto');

    if (mensajes?.error || !Array.isArray(mensajes)) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center py-3">${mensajes?.error || 'Error al cargar mensajes'}</td></tr>`;
      return;
    }

    if (!mensajes.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-muted text-center py-4">No hay mensajes de contacto</td></tr>';
      return;
    }

    tbody.innerHTML = mensajes.map((m, i) => `
      <tr>
        <td>${m.id}</td>
        <td>${escapeHtml(m.nombre)}</td>
        <td><a href="mailto:${escapeHtml(m.email)}">${escapeHtml(m.email)}</a></td>
        <td>${escapeHtml(m.asunto)}</td>
        <td style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(m.mensaje)}">${escapeHtml(m.mensaje)}</td>
        <td><small>${new Date(m.fechaCreacion).toLocaleString('es-ES')}</small></td>
      </tr>`).join('');
  } catch (e) {
    console.error('Error cargando mensajes:', e);
    tbody.innerHTML = '<tr><td colspan="6" class="text-danger text-center py-3">Error al cargar mensajes</td></tr>';
  }
}
