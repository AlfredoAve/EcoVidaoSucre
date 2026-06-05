// Main - Página principal
const usuarioActualHome = JSON.parse(localStorage.getItem('usuario') || 'null');
const esAdminHome = usuarioActualHome?.rol === 'admin';
let favoritosIdsHome = new Set();

document.addEventListener('DOMContentLoaded', async () => {
  // Cargar favoritos primero para que las tarjetas se rendericen con el estado correcto.
  await cargarFavoritosIdsHome();
  await Promise.all([cargarCategorias(), cargarProductosDestacados()]);
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
        <a href="productos.html?categoria=${cat.id}" class="text-decoration-none">
          <div class="card h-100 border-0 hover-shadow category-card-shadow" style="position:relative;overflow:hidden;">
            <img src="${APIService.getImageUrl(cat.imagen)}"
                 class="card-img-top"
                 style="height:160px;object-fit:cover;"
                 alt="${escapeHtml(cat.nombre)}"
                 loading="lazy"
                 width="400"
                 height="220"
                 onerror="this.src='https://placehold.co/400x400/e9ecef/6c757d?text=Sin+Imagen';this.onerror=null;">
            ${cat.productosCount === 0 ? '<span style="position:absolute;top:8px;right:8px;background:#1b4332;color:white;font-size:11px;padding:2px 8px;border-radius:20px;font-weight:600;z-index:1;">Próximamente</span>' : ''}
            <div class="card-body text-center" style="padding:12px;">
              <h5 class="card-title fw-bold text-dark" style="font-size:0.95rem;margin-bottom:4px;">${escapeHtml(cat.nombre)}</h5>
              <p class="text-muted small mb-0">${cat.productosCount || 0} productos</p>
            </div>
          </div>
        </a>
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
    const data = await APIService.obtenerProductos(1, 100, '', '', true);
    // [NUEVO] Extraer productos si la respuesta es paginada
    const productos = data.productos ? data.productos : data;

    if (!productos || productos.length === 0) {
      container.innerHTML = '<div class="col-12 text-center text-muted">No hay productos destacados por ahora</div>';
      return;
    }

    let html = '';
    productos.forEach(prod => {
      const enStockH = prod.stock > 0;
      const esFavorito = favoritosIdsHome.has(prod.id);
      const ratingHtml = renderProductRating(prod.promedioResenas, prod.totalResenas);
      html += `
        <div class="col-12 col-md-4 col-lg-3">
          <div class="card h-100 border-0 eco-card">
            <div class="eco-card-img-wrapper">
              <img src="${APIService.getImageUrl(prod.imagen)}"
                   class="card-img-top eco-card-img"
                   alt="${escapeHtml(prod.nombre)}"
                   loading="lazy"
                   width="400"
                   height="220"
                   onerror="this.src='https://placehold.co/400x400/e9ecef/6c757d?text=Sin+Imagen';this.onerror=null;">
              <button class="fav-btn ${esFavorito ? 'active' : ''}" type="button" data-product-id="${prod.id}" aria-label="Favorito">
                <i class="bi ${esFavorito ? 'bi-heart-fill' : 'bi-heart'}"></i>
              </button>
            </div>
            <div class="card-body d-flex flex-column eco-card-body">
              <span class="eco-cat-label">${escapeHtml(prod.categoriaNombre || 'Natural')}</span>
              <h6 class="card-title fw-bold mb-1 eco-card-title">${escapeHtml(prod.nombre)}</h6>
              ${ratingHtml}
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
