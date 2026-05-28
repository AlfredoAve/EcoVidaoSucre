
// ─── Notificaciones toast (reemplaza alert/confirm nativos) ───────────────
function showNotif(msg, type='success') {
  // Buscar o crear el container de toasts
  let container = document.getElementById('_notifContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = '_notifContainer';
    container.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:320px;';
    document.body.appendChild(container);
  }
  const colors = {success:'#2d6a4f', error:'#dc3545', warning:'#b5830a', info:'#0a6bb5'};
  const icons  = {success:'bi-check-circle-fill', error:'bi-x-circle-fill', warning:'bi-exclamation-triangle-fill', info:'bi-info-circle-fill'};
  const bg = colors[type] || colors.success;
  const ic = icons[type]  || icons.success;
  const id = '_n' + Date.now();
  container.insertAdjacentHTML('beforeend', `
    <div id="${id}" style="background:${bg};color:#fff;padding:12px 16px;border-radius:12px;
      box-shadow:0 8px 24px rgba(0,0,0,0.18);display:flex;align-items:center;gap:10px;
      font-family:'DM Sans',sans-serif;font-size:.92rem;font-weight:500;
      animation:slideInNotif .25s ease;min-width:220px;">
      <i class="bi ${ic}" style="font-size:1.1rem;flex-shrink:0;"></i>
      <span style="flex:1;">${msg}</span>
      <button onclick="this.closest('[id^=_n]').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:.85rem;line-height:1;flex-shrink:0;">✕</button>
    </div>`);
  const el = document.getElementById(id);
  setTimeout(() => { if(el) { el.style.opacity='0'; el.style.transform='translateX(20px)'; el.style.transition='.3s'; setTimeout(()=>el.remove(),310); } }, 3800);
}

function showConfirm(msg, onConfirm) {
  let overlay = document.getElementById('_confirmOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = '_confirmOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10000;display:flex;align-items:center;justify-content:center;';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:18px;padding:28px 28px 22px;max-width:380px;width:90%;
      box-shadow:0 20px 50px rgba(0,0,0,.22);font-family:'DM Sans',sans-serif;">
      <p style="color:#1b4332;font-weight:600;font-size:1rem;margin:0 0 20px;">${msg}</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="_confirmNo" style="padding:8px 18px;border-radius:9px;border:1.5px solid #ddd;background:#fff;cursor:pointer;font-weight:500;">Cancelar</button>
        <button id="_confirmYes" style="padding:8px 18px;border-radius:9px;background:#2d6a4f;color:#fff;border:none;cursor:pointer;font-weight:600;">Confirmar</button>
      </div>
    </div>`;
  overlay.style.display = 'flex';
  document.getElementById('_confirmYes').onclick = () => { overlay.style.display='none'; onConfirm(); };
  document.getElementById('_confirmNo').onclick  = () => { overlay.style.display='none'; };
}

// Profile - Gestión del perfil de usuario
document.addEventListener('DOMContentLoaded', async () => {
  const token = APIService.getToken();
  const usuarioLocal = JSON.parse(localStorage.getItem('usuario') || 'null');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  if (usuarioLocal?.rol === 'admin') {
    window.location.href = 'panel-admin.html';
    return;
  }

  await cargarDatosPerfil();
  configurarEventos();
});

async function cargarDatosPerfil() {
  try {
    const usuario = await APIService.obtenerPerfil();

    document.getElementById('userName').textContent = usuario.nombre;
    document.getElementById('userEmail').textContent = usuario.email;

    document.getElementById('nombre').value = usuario.nombre || '';
    document.getElementById('email').value = usuario.email || '';
    document.getElementById('telefono').value = usuario.telefono || '';
    document.getElementById('ciudad').value = usuario.ciudad || '';
    document.getElementById('direccion').value = usuario.direccion || '';
  } catch (error) {
    console.error('Error cargando perfil:', error);
    showNotif('Error al cargar el perfil');
  }
}

function configurarEventos() {
  // Cambio de tabs
  document.querySelectorAll('.tab-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      cambiarTab(link.dataset.tab);
    });
  });

  // Formulario de perfil
  document.getElementById('profileForm')?.addEventListener('submit', guardarPerfil);

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
}

function cambiarTab(tabName) {
  // Ocultar todas las tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });

  // Quitar clase active de todos los links
  document.querySelectorAll('.tab-link').forEach(link => {
    link.classList.remove('active');
  });

  // Mostrar tab seleccionada
  const tab = document.getElementById(`${tabName}-tab`);
  if (tab) {
    tab.style.display = 'block';
  }

  // Agregar clase active al link
  document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

  // Cargar datos si es necesario
  if (tabName === 'ordenes') {
    cargarOrdenes();
  } else if (tabName === 'resenas') {
    cargarResenas();
  } else if (tabName === 'favoritos') {
    cargarFavoritos();
  }
}

async function cargarFavoritos() {
  const container = document.getElementById('favoritosList');
  const emptyState = document.getElementById('favoritosEmpty');

  if (!container || !emptyState) return;

  container.innerHTML = '<div class="spinner-border" role="status"></div>';
  emptyState.style.display = 'none';

  try {
    const favoritos = await APIService.obtenerFavoritos();

    if (!favoritos || favoritos.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    const cards = favoritos.map((prod) => {
      return `
        <div class="col-sm-6 col-lg-4">
          <div class="card h-100 border-0 eco-card">
            <div class="eco-card-img-wrapper">
              <img src="${escapeHtml(prod.imagen || '../images/producto-default.svg')}"
                   class="card-img-top eco-card-img"
                   alt="${escapeHtml(prod.nombre)}"
                   onerror="this.src='../images/producto-default.svg';this.onerror=null;">
              <span class="eco-stock-badge eco-stock-ok">Favorito</span>
            </div>
            <div class="card-body d-flex flex-column eco-card-body">
              <span class="eco-cat-label">${escapeHtml(prod.categoriaNombre || 'Natural')}</span>
              <h6 class="card-title fw-bold mb-1 eco-card-title">${escapeHtml(prod.nombre)}</h6>
              <div class="d-flex align-items-center justify-content-between mt-1 mb-3">
                <span class="prod-precio fw-bold eco-precio">Bs ${Number(prod.precio || 0).toFixed(2)}</span>
              </div>
              <div class="d-flex gap-2 mt-auto eco-btn-row">
                <a href="productos.html" class="btn btn-outline-secondary btn-sm flex-grow-1 eco-btn-ver">
                  Ver más
                </a>
                <button class="btn btn-outline-secondary btn-sm flex-grow-1" data-remove-favorito="${prod.id}">
                  Quitar
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `<div class="row g-3">${cards}</div>`;

    container.addEventListener('click', async (event) => {
      const btn = event.target.closest('[data-remove-favorito]');
      if (!btn) return;
      event.preventDefault();
      const productoId = Number(btn.dataset.removeFavorito);
      const resultado = await APIService.eliminarFavorito(productoId);
      if (resultado?.error) {
        showNotif(resultado.error);
        return;
      }
      cargarFavoritos();
    }, { once: true });
  } catch (error) {
    console.error('Error cargando favoritos:', error);
    container.innerHTML = '<p class="text-danger">Error al cargar favoritos</p>';
  }
}

async function guardarPerfil(e) {
  e.preventDefault();

  const datos = {
    nombre: document.getElementById('nombre').value,
    telefono: document.getElementById('telefono').value,
    ciudad: document.getElementById('ciudad').value,
    direccion: document.getElementById('direccion').value
  };

  try {
    const resultado = await APIService.actualizarPerfil(datos);

    if (resultado.error) {
      document.getElementById('errorMsg').textContent = resultado.error;
      document.getElementById('errorMsg').style.display = 'block';
      return;
    }

    document.getElementById('successMsg').textContent = 'Perfil actualizado correctamente';
    document.getElementById('successMsg').style.display = 'block';

    setTimeout(() => {
      document.getElementById('successMsg').style.display = 'none';
    }, 3000);

    // Actualizar nombre en header
    document.getElementById('userName').textContent = datos.nombre;
  } catch (error) {
    document.getElementById('errorMsg').textContent = 'Error al guardar el perfil';
    document.getElementById('errorMsg').style.display = 'block';
  }
}

async function cargarOrdenes() {
  const container = document.getElementById('ordenesList');
  container.innerHTML = '<div class="spinner-border" role="status"></div>';

  try {
    const ordenes = await APIService.obtenerMisOrdenes();

    if (!ordenes || ordenes.length === 0) {
      container.innerHTML = '<p class="text-muted">No tienes órdenes aún</p>';
      return;
    }

    let html = '';
    ordenes.forEach(orden => {
      html += `
        <div class="mb-3 p-3 border rounded">
          <div class="d-flex justify-content-between mb-2">
            <strong>Orden #${orden.id}</strong>
            <span class="badge bg-info">${escapeHtml(orden.estado)}</span>
          </div>
          <p class="mb-1 text-muted small">Fecha: ${new Date(orden.fechaCreacion).toLocaleDateString()}</p>
          <p class="mb-1 text-muted small">Total: <strong class="text-success">$${orden.total.toFixed(2)}</strong></p>
          <p class="mb-0 text-muted small">Envío a: ${escapeHtml(orden.direccionEnvio)}</p>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (error) {
    console.error('Error cargando órdenes:', error);
    container.innerHTML = '<p class="text-danger">Error al cargar órdenes</p>';
  }
}

async function cargarResenas() {
  const container = document.getElementById('resenasList');
  container.innerHTML = '<div class="spinner-border" role="status"></div>';

  try {
    const resenas = await APIService.obtenerMisResenas();

    if (!resenas || resenas.length === 0) {
      container.innerHTML = '<p class="text-muted">No has escrito reseñas aún</p>';
      return;
    }

    let html = '';
    resenas.forEach(resena => {
      let estrellas = '⭐'.repeat(resena.calificacion);
      html += `
        <div class="mb-3 p-3 border rounded">
          <div class="mb-2">
            <strong>${escapeHtml(resena.nombre)}</strong>
            <span class="text-warning">${estrellas}</span>
          </div>
          <p class="mb-1 text-muted">${escapeHtml(resena.comentario)}</p>
          <p class="mb-0 text-muted small">${new Date(resena.fechaCreacion).toLocaleDateString()}</p>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (error) {
    console.error('Error cargando reseñas:', error);
    container.innerHTML = '<p class="text-danger">Error al cargar reseñas</p>';
  }
}
