
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

// Main - Página principal
const usuarioActualHome = JSON.parse(localStorage.getItem('usuario') || 'null');
const esAdminHome = usuarioActualHome?.rol === 'admin';
let favoritosIdsHome = new Set();

document.addEventListener('DOMContentLoaded', async () => {
  await cargarFavoritosIdsHome();
  await cargarCategorias();
  await cargarProductosDestacados();
  initHeroCarousel();
});

async function cargarFavoritosIdsHome() {
  if (!APIService.getToken()) {
    favoritosIdsHome = new Set();
    return;
  }

  try {
    const ids = await APIService.obtenerFavoritosIds();
    favoritosIdsHome = new Set(ids || []);
  } catch (error) {
    console.error('Error cargando favoritos:', error);
    favoritosIdsHome = new Set();
  }
}

// Carrusel automático de imágenes hero
function initHeroCarousel() {
  const slides = document.querySelectorAll('.hero-slide');
  if (slides.length === 0) return;

  let currentSlide = 0;

  function nextSlide() {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
  }

  setInterval(nextSlide, 5000);
}

// Cargar categorías
async function cargarCategorias() {
  const container = document.querySelector('.categories-grid');
  if (!container) return;

  try {
    const categorias = await APIService.obtenerCategorias();

    if (!categorias || categorias.length === 0) {
      container.innerHTML = '<div class="col-12 text-center text-muted">No hay categorías disponibles</div>';
      return;
    }

    let html = '';
    categorias.forEach(cat => {
      html += `
        <div class="col-6 col-md-3 mb-4">
          <a href="productos.html?categoria=${cat.id}" class="text-decoration-none">
            <div class="card h-100 border-0 hover-shadow category-card-shadow" style="position:relative;overflow:hidden;">
              <img src="${escapeHtml(cat.imagen || '../images/producto-default.svg')}"
                   class="card-img-top"
                   style="height:200px;object-fit:cover;"
                   alt="${escapeHtml(cat.nombre)}"
                   onerror="this.src='../images/producto-default.svg';this.onerror=null;">
              ${cat.productosCount === 0 ? '<span style="position:absolute;top:8px;right:8px;background:#1b4332;color:white;font-size:11px;padding:2px 8px;border-radius:20px;font-weight:600;z-index:1;">Próximamente</span>' : ''}
              <div class="card-body text-center">
                <h5 class="card-title fw-bold text-dark">${escapeHtml(cat.nombre)}</h5>
                <p class="text-muted small mb-0">${cat.productosCount || 0} productos</p>
              </div>
            </div>
          </a>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (error) {
    console.error('Error cargando categorías:', error);
    container.innerHTML = '<div class="col-12 text-danger text-center">Error al cargar categorías</div>';
  }
}

// Cargar productos destacados
async function cargarProductosDestacados() {
  const container = document.querySelector('.products-grid');
  if (!container) return;

  try {
    const productos = await APIService.obtenerProductos();

    if (!productos || productos.length === 0) {
      container.innerHTML = '<div class="col-12 text-center text-muted">No hay productos disponibles</div>';
      return;
    }

    // Mostrar solo 6 productos destacados
    const destacados = productos.slice(0, 6);

    let html = '';
    destacados.forEach(prod => {
      const enStockH = prod.stock > 0;
      const esFavorito = favoritosIdsHome.has(prod.id);
      html += `
        <div class="col-sm-6 col-md-4 col-lg-3">
          <div class="card h-100 border-0 eco-card">
            <div class="eco-card-img-wrapper">
              <img src="${escapeHtml(prod.imagen || '../images/producto-default.svg')}"
                   class="card-img-top eco-card-img"
                   alt="${escapeHtml(prod.nombre)}"
                   onerror="this.src='../images/producto-default.svg';this.onerror=null;">
              <button class="fav-btn ${esFavorito ? 'active' : ''}" type="button" data-product-id="${prod.id}" aria-label="Favorito">
                <i class="bi ${esFavorito ? 'bi-heart-fill' : 'bi-heart'}"></i>
              </button>
            </div>
            <div class="card-body d-flex flex-column eco-card-body">
              <span class="eco-cat-label">${escapeHtml(prod.categoriaNombre || 'Natural')}</span>
              <h6 class="card-title fw-bold mb-1 eco-card-title">${escapeHtml(prod.nombre)}</h6>
              <div class="d-flex align-items-center justify-content-between mt-1 mb-3">
                <span class="prod-precio fw-bold eco-precio">Bs ${prod.precio.toFixed(2)}</span>
                <span class="badge-stock ${enStockH ? 'stock-ok' : 'stock-no'}">${enStockH ? 'En stock' : 'Sin stock'}</span>
              </div>
              <div class="d-flex gap-2 mt-auto eco-btn-row">
                <a href="productos.html" class="btn btn-outline-secondary btn-sm flex-grow-1 eco-btn-ver">
                  Ver más
                </a>
                <button class="btn btn-success btn-sm flex-grow-1 eco-btn-add"
                        onclick="agregarProductoDestacado(${prod.id})"
                        ${enStockH ? '' : 'disabled'}>
                  <i class="bi bi-bag-plus"></i> Añadir
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    container.addEventListener('click', onFavoritoHomeClick);
  } catch (error) {
    console.error('Error cargando productos:', error);
    container.innerHTML = '<div class="col-12 text-danger text-center">Error al cargar productos</div>';
  }
}

async function onFavoritoHomeClick(event) {
  const btn = event.target.closest('.fav-btn');
  if (!btn) return;

  event.preventDefault();
  event.stopPropagation();

  const productoId = Number(btn.dataset.productId);

  if (!APIService.getToken()) {
    showNotif('Debes iniciar sesión para guardar favoritos');
    window.location.href = 'login.html';
    return;
  }

  const esFavorito = btn.classList.contains('active');
  const resultado = esFavorito
    ? await APIService.eliminarFavorito(productoId)
    : await APIService.agregarFavorito(productoId);

  if (resultado?.error) {
    showNotif(resultado.error);
    return;
  }

  if (esFavorito) {
    favoritosIdsHome.delete(productoId);
    btn.classList.remove('active');
    btn.innerHTML = '<i class="bi bi-heart"></i>';
  } else {
    favoritosIdsHome.add(productoId);
    btn.classList.add('active');
    btn.innerHTML = '<i class="bi bi-heart-fill"></i>';
  }
}

async function agregarProductoDestacado(productoId) {
  const token = APIService.getToken();

  if (!token) {
    showNotif('Debes iniciar sesión para agregar al carrito');
    window.location.href = 'login.html';
    return;
  }

  try {
    const resultado = await APIService.agregarAlCarrito(productoId, 1);

    if (resultado.error) {
      showNotif(resultado.error);
      return;
    }

    showNotif('Producto agregado al carrito');
    actualizarBadgeCarrito();
  } catch (error) {
    showNotif('Error al agregar al carrito');
  }
}
