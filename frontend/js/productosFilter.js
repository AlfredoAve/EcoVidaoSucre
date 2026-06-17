// Productos Filter - Página de productos con filtros
let todosProductos = [];
let productoSeleccionado = null;
const usuarioActual = JSON.parse(localStorage.getItem('usuario') || 'null');
const esAdmin = usuarioActual?.rol === 'admin';
let favoritosIdsCatalogo = new Set();
// [NUEVO] Estado de paginación
let currentPage = 1;
const LIMIT = 20;
let totalPages = 1;
const PRICE_MIN = 0;
const PRICE_MAX = 1000;

function renderProductSkeletons(count = 8) {
  return Array.from({ length: count }, () => `
    <div class="col-12 col-md-4 col-lg-3">
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton-media"></div>
        <div class="skeleton-body">
          <div class="skeleton-line is-short"></div>
          <div class="skeleton-line is-title"></div>
          <div class="skeleton-row">
            <div class="skeleton-line is-price"></div>
            <div class="skeleton-pill"></div>
          </div>
          <div class="skeleton-actions">
            <div class="skeleton-button"></div>
            <div class="skeleton-button"></div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderCategoryChipSkeletons(count = 5) {
  return Array.from({ length: count }, () => '<span class="skeleton-chip" aria-hidden="true"></span>').join('');
}

async function ensureBootstrap() {
  if (window.bootstrap?.Modal) return;

  const existing = document.querySelector('script[data-bootstrap]');
  if (existing) {
    await new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error('Bootstrap no cargo')), { once: true });
    });
    return;
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js';
    script.defer = true;
    script.dataset.bootstrap = 'true';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Bootstrap no cargo'));
    document.head.appendChild(script);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // Cargar favoritos primero para que las tarjetas se rendericen con el estado correcto.
  await cargarFavoritosIdsCatalogo();
  await Promise.all([cargarProductos(), cargarCategorias()]);
  configurarEventos();
  aplicarFiltroDesdeURL();
});

async function cargarFavoritosIdsCatalogo() {
  if (!APIService.getToken()) {
    favoritosIdsCatalogo = new Set();
    return;
  }

  try {
    const ids = await APIService.obtenerFavoritosIds();
    favoritosIdsCatalogo = new Set(ids || []);
  } catch (error) {
    console.error('Error cargando favoritos:', error);
    favoritosIdsCatalogo = new Set();
  }
}

// [NUEVO] Lógica adaptada para consumir API paginada
async function cargarProductos(append = false) {
  const container = document.getElementById('productsList');
  const noResultsMsg = document.getElementById('noResultsMsg');
  const termino = document.getElementById('searchInput')?.value || '';
  
  const seleccionadas = Array.from(document.querySelectorAll('.categoria-filter:checked')).map(el => el.value);
  const categoriaId = seleccionadas.length > 0 ? seleccionadas[0] : ''; 

  try {
    if (!append && container) {
      container.style.display = '';
      container.innerHTML = renderProductSkeletons();
      if (noResultsMsg) noResultsMsg.style.display = 'none';
    }

    const data = await APIService.obtenerProductos(currentPage, LIMIT, categoriaId, termino);
    const productos = data.productos || [];
    totalPages = data.totalPaginas || 1;

    if (!append) {
      todosProductos = productos;
    } else {
      todosProductos = [...todosProductos, ...productos];
    }

    renderizarConFiltroPrecio();
    actualizarBotonCargarMas();
  } catch (error) {
    container.innerHTML = '<div class="col-12 text-danger">Error al cargar productos</div>';
  }
}

// [NUEVO] Separar filtro de precio local
function renderizarConFiltroPrecio() {
  const { minPrice, maxPrice } = syncPriceRange();
  const productsList = document.getElementById('productsList');
  const noResultsMsg = document.getElementById('noResultsMsg');

  let filtrados = todosProductos.filter(p => p.precio >= minPrice && p.precio <= maxPrice);

  if (filtrados.length === 0) {
    productsList.style.display = 'none';
    noResultsMsg.style.display = 'block';
  } else {
    productsList.style.display = '';
    noResultsMsg.style.display = 'none';
    renderizarProductos(filtrados);
  }
}

// [NUEVO] Botón Cargar Más
function actualizarBotonCargarMas() {
  let btnContainer = document.getElementById('loadMoreContainer');
  
  if (!btnContainer) {
    btnContainer = document.createElement('div');
    btnContainer.id = 'loadMoreContainer';
    btnContainer.className = 'col-12 text-center mt-4 mb-5';
    btnContainer.innerHTML = '<button id="loadMoreBtn" class="btn btn-outline-success px-4 py-2"><i class="bi bi-arrow-down-circle"></i> Cargar más productos</button>';
    const productsList = document.getElementById('productsList');
    productsList.parentNode.insertBefore(btnContainer, productsList.nextSibling);
    
    document.getElementById('loadMoreBtn').addEventListener('click', () => {
      currentPage++;
      cargarProductos(true);
    });
  }

  if (currentPage >= totalPages || totalPages === 0) {
    btnContainer.style.display = 'none';
  } else {
    btnContainer.style.display = 'block';
  }
}

async function cargarCategorias() {
  const container = document.getElementById('categoriesList');

  try {
    if (container) container.innerHTML = renderCategoryChipSkeletons();

    const categorias = await APIService.obtenerCategorias();

    let html = `
      <div class="form-check">
        <input class="form-check-input categoria-filter" type="checkbox" value="" id="catTodas" checked>
        <label class="form-check-label" for="catTodas">
          Todas
        </label>
      </div>
    `;
    categorias.forEach(cat => {
      html += `
        <div class="form-check">
          <input class="form-check-input categoria-filter" type="checkbox" value="${cat.id}" id="cat${cat.id}">
          <label class="form-check-label" for="cat${cat.id}">
            ${escapeHtml(cat.nombre)}
          </label>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (error) {
    console.error('Error cargando categorías:', error);
  }
}

function configurarEventos() {
  // Búsqueda
  document.getElementById('searchInput')?.addEventListener('input', aplicarFiltros);

  // Slider de precio
  document.getElementById('minPriceRange')?.addEventListener('input', () => syncPriceRange('min'));
  document.getElementById('maxPriceRange')?.addEventListener('input', () => syncPriceRange('max'));
  syncPriceRange();

  // Filtro de categoría
  document.querySelectorAll('.categoria-filter').forEach(el => {
    el.addEventListener('change', () => {
      if (el.checked) {
        document.querySelectorAll('.categoria-filter').forEach(item => {
          if (item !== el) item.checked = false;
        });
      }

      const algunaSeleccionada = Array.from(document.querySelectorAll('.categoria-filter')).some(item => item.checked);
      const todas = document.getElementById('catTodas');
      if (!algunaSeleccionada && todas) todas.checked = true;

      aplicarFiltros();
    });
  });

  // Filtro de precio
  document.getElementById('filterBtn')?.addEventListener('click', renderizarConFiltroPrecio);

  // Limpiar filtros
  document.getElementById('clearFiltersBtn')?.addEventListener('click', limpiarFiltros);

  // Continuar comprando
  document.getElementById('continueShopping')?.addEventListener('click', () => {
    window.location.href = 'productos.html';
  });

  // Delegacion de eventos para botones "Ver mas"
  document.getElementById('productsList')?.addEventListener('click', (event) => {
    const favBtn = event.target.closest('.fav-btn');
    if (favBtn) {
      event.preventDefault();
      event.stopPropagation();
      toggleFavoritoCatalogo(favBtn);
      return;
    }
    const boton = event.target.closest('[data-product-id]');
    if (!boton) return;
    event.preventDefault();
    abrirProducto(Number(boton.dataset.productId));
  });
}

async function toggleFavoritoCatalogo(btn) {
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
    favoritosIdsCatalogo.delete(productoId);
    btn.classList.remove('active');
    btn.innerHTML = '<i class="bi bi-heart"></i>';
  } else {
    favoritosIdsCatalogo.add(productoId);
    btn.classList.add('active');
    btn.innerHTML = '<i class="bi bi-heart-fill"></i>';
  }
}

function aplicarFiltros() {
  // [NUEVO] Al filtrar, volvemos a la página 1 y hacemos fetch
  currentPage = 1;
  cargarProductos(false);
}

function aplicarFiltroDesdeURL() {
  const params = new URLSearchParams(window.location.search);
  const categoriaId = params.get('categoria');
  if (categoriaId) {
    const checkbox = document.getElementById(`cat${categoriaId}`);
    if (checkbox) {
      document.querySelectorAll('.categoria-filter').forEach(el => el.checked = false);
      checkbox.checked = true;
      aplicarFiltros();
    }
  }
}

function limpiarFiltros() {
  document.getElementById('searchInput').value = '';
  const minRange = document.getElementById('minPriceRange');
  const maxRange = document.getElementById('maxPriceRange');
  if (minRange) minRange.value = PRICE_MIN;
  if (maxRange) maxRange.value = PRICE_MAX;
  syncPriceRange();
  document.querySelectorAll('.categoria-filter').forEach(el => el.checked = false);
  const todas = document.getElementById('catTodas');
  if (todas) todas.checked = true;
  
  currentPage = 1;
  cargarProductos(false);
}

function syncPriceRange(activeHandle = null) {
  const minRange = document.getElementById('minPriceRange');
  const maxRange = document.getElementById('maxPriceRange');
  const minLabel = document.getElementById('priceMinLabel');
  const maxLabel = document.getElementById('priceMaxLabel');
  const fill = document.getElementById('priceRangeFill');

  if (!minRange || !maxRange) {
    return { minPrice: PRICE_MIN, maxPrice: PRICE_MAX };
  }

  let minPrice = Number(minRange.value || PRICE_MIN);
  let maxPrice = Number(maxRange.value || PRICE_MAX);

  if (minPrice > maxPrice) {
    if (activeHandle === 'min') {
      maxPrice = minPrice;
    } else {
      minPrice = maxPrice;
    }
  }

  minRange.value = minPrice;
  maxRange.value = maxPrice;

  if (minLabel) minLabel.textContent = `Bs ${minPrice}`;
  if (maxLabel) maxLabel.textContent = `Bs ${maxPrice}`;

  if (fill) {
    const span = PRICE_MAX - PRICE_MIN;
    const left = ((minPrice - PRICE_MIN) / span) * 100;
    const right = ((maxPrice - PRICE_MIN) / span) * 100;
    fill.style.left = `${left}%`;
    fill.style.width = `${Math.max(0, right - left)}%`;
  }

  return { minPrice, maxPrice };
}

function renderizarProductos(productos) {
  const container = document.getElementById('productsList');

  let html = '';
  productos.forEach(prod => {
    const enStock = prod.stock > 0;
    const esFavorito = favoritosIdsCatalogo.has(prod.id);
    const ratingHtml = renderProductRating(prod.promedioResenas, prod.totalResenas);
    html += `
      <div class="col-12 col-md-4 col-lg-3">
        <div class="card h-100 border-0 eco-card">
          <div class="eco-card-img-wrapper">
            <img src="${APIService.getImageUrl(prod.imagen)}"
                 class="card-img-top eco-card-img"
                 alt="${escapeHtml(prod.nombre)}"
                 loading="lazy"
                 decoding="async"
                 width="900"
                 height="495"
                 sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 991px) 50vw, 25vw"
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
              <span class="badge-stock ${enStock ? 'stock-ok' : 'stock-no'}">${enStock ? 'En stock' : 'Sin stock'}</span>
            </div>
            <div class="d-flex gap-2 mt-auto eco-btn-row">
              <button class="btn btn-outline-secondary btn-sm flex-grow-1 eco-btn-ver" data-product-id="${prod.id}" type="button">
                Ver más
              </button>
              <button class="btn btn-success btn-sm flex-grow-1 eco-btn-add"
                      onclick="window.agregarAlCarritoDesdeTarjeta(${prod.id})"
                      ${enStock ? '' : 'disabled'}>
                <i class="bi bi-bag-plus"></i> Añadir
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

async function abrirProducto(productoId) {
  try {
    await ensureBootstrap();
    productoSeleccionado = await APIService.obtenerProductoPorId(productoId);

    if (!productoSeleccionado || productoSeleccionado.error) {
      throw new Error(productoSeleccionado?.error || 'Producto no encontrado');
    }

    const stock = Number(productoSeleccionado.stock || 0);
    const addBtn = document.getElementById('addToCartBtn');

    document.getElementById('productTitle').textContent = productoSeleccionado.nombre;
    const categoriaProducto = productoSeleccionado.categoriaNombre || 'Producto natural';
    document.getElementById('productCategory').textContent = categoriaProducto;
    document.getElementById('productRatingSummary').innerHTML = renderProductRating(
      productoSeleccionado.promedioResenas,
      productoSeleccionado.totalResenas
    );
    const imgEl = document.getElementById('productImage');
    imgEl.src = APIService.getImageUrl(productoSeleccionado.imagen);
    imgEl.onerror = function() { this.src = 'https://placehold.co/400x400/e9ecef/6c757d?text=Sin+Imagen'; this.onerror = null; };
    document.getElementById('productDesc').textContent = productoSeleccionado.descripcion || '';
    document.getElementById('productPrice').textContent = productoSeleccionado.precio.toFixed(2);
    document.getElementById('productStock').textContent = stock;
    document.getElementById('productQty').max = stock;
    document.getElementById('productQty').value = stock > 0 ? 1 : 0;

    const beneficios = Array.isArray(productoSeleccionado.beneficios) ? productoSeleccionado.beneficios : [];
    const benefitsSection = document.getElementById('productBenefitsSection');
    const benefitsContainer = document.getElementById('productBenefits');
    if (beneficios.length > 0) {
      benefitsContainer.innerHTML = beneficios.map(beneficio => `
        <div class="product-benefit-item">
          <i class="bi bi-check-circle-fill" aria-hidden="true"></i>
          <span>${escapeHtml(beneficio)}</span>
        </div>
      `).join('');
      benefitsSection.style.display = 'block';
    } else {
      benefitsContainer.innerHTML = '';
      benefitsSection.style.display = 'none';
    }

    if (addBtn) {
      addBtn.disabled = stock <= 0;
    }

    // Cargar reseñas
    await cargarResenasProducto(productoId);

    // Solo permitir reseñas a clientes que confirmaron la recepción del producto.
    const btnShowReview  = document.getElementById('btnShowReviewForm');
    const btnLoginReview = document.getElementById('btnLoginToReview');
    const usuarioLocal = JSON.parse(localStorage.getItem('usuario') || 'null');
    if (APIService.getToken() && usuarioLocal?.rol !== 'admin') {
      const elegibilidad = await APIService.puedeResenarProducto(productoId);
      if (btnShowReview)  { btnShowReview.style.display = elegibilidad.puedeResenar ? 'inline-block' : 'none'; }
      if (btnLoginReview) { btnLoginReview.style.display = 'none'; }
    } else if (APIService.getToken()) {
      if (btnShowReview)  { btnShowReview.style.display = 'none'; }
      if (btnLoginReview) { btnLoginReview.style.display = 'none'; }
    } else {
      if (btnShowReview)  { btnShowReview.style.display  = 'none'; }
      if (btnLoginReview) { btnLoginReview.style.display = 'inline-block'; }
    }
    // Resetear formulario de reseña al abrir nuevo producto
    const reviewContainer = document.getElementById('reviewFormContainer');
    if (reviewContainer) reviewContainer.style.display = 'none';
    const reviewComment = document.getElementById('reviewComment');
    if (reviewComment) reviewComment.value = '';

    // Mostrar modal
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('productModal'));
    modal.show();

    // Configurar botón agregar al carrito
    addBtn.onclick = () => agregarAlCarrito(productoId);
  } catch (error) {
    console.error('Error al cargar el producto:', error);
    showNotif(error?.message || 'Error al cargar el producto');
  }
}

// ─── NUEVA LÓGICA DE RESEÑAS PREMIUM ─────────────────────────────────────────
async function cargarResenasProducto(productoId) {
  try {
    const data = await APIService.obtenerResenasProducto(productoId);
    const container = document.getElementById('resenaProducto');

    let html = '';

    if (data.total > 0) {
      const promedio = Number(data.promedio).toFixed(1);
      html += `<div class="mb-4 small"><strong>Calificación General:</strong> <span class="text-warning" style="font-size:1.1rem;">${'★'.repeat(Math.round(data.promedio))}</span> (${promedio}/5 — ${data.total} reseña${data.total !== 1 ? 's' : ''})</div>`;
      
      const resenas = data.resenas || [];
      resenas.forEach(r => {
        const estrellas = '<i class="bi bi-star-fill"></i>'.repeat(r.calificacion) + 
                          '<i class="bi bi-star"></i>'.repeat(5 - r.calificacion);
        html += `
          <div class="review-item">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <p class="review-user-name">${escapeHtml(r.nombre || r.usuarioNombre || 'Cliente')}</p>
                <div class="review-stars">${estrellas}</div>
              </div>
              <span class="review-date">${new Date(r.fechaCreacion).toLocaleDateString()}</span>
            </div>
            <p class="review-text">${escapeHtml(r.comentario || '')}</p>
          </div>
        `;
      });
    } else {
      html = `
        <div class="review-empty-state">
          <i class="bi bi-chat-heart"></i>
          <h6 class="text-dark fw-bold mb-1">Aún no hay reseñas</h6>
          <p class="text-muted text-sm mb-0">¡Sé el primero en calificar este producto!</p>
        </div>
      `;
    }

    container.innerHTML = html;
  } catch (error) {
    console.error('Error cargando reseñas:', error);
  }
}

// Evento para mostrar el formulario de reseña
document.getElementById('btnShowReviewForm')?.addEventListener('click', () => {
  const container = document.getElementById('reviewFormContainer');
  if (container) container.style.display = 'block';
  const btn = document.getElementById('btnShowReviewForm');
  if (btn) btn.style.display = 'none';
});

// Evento para cancelar el formulario de reseña
document.getElementById('cancelReviewBtn')?.addEventListener('click', () => {
  const container = document.getElementById('reviewFormContainer');
  if (container) container.style.display = 'none';
  const comment = document.getElementById('reviewComment');
  if (comment) comment.value = '';
  const btnShow = document.getElementById('btnShowReviewForm');
  if (btnShow) btnShow.style.display = 'inline-block';
  // Resetear estrellas
  document.querySelectorAll('#starRatingContainer i').forEach(s => {
    s.className = 'bi bi-star';
  });
  const submitBtn = document.getElementById('submitReviewBtn');
  if (submitBtn) submitBtn.removeAttribute('data-calificacion');
});

// Evento para el botón de enviar reseña
document.getElementById('submitReviewBtn')?.addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const calificacion = parseInt(btn.getAttribute('data-calificacion') || '0');
  const comentario = document.getElementById('reviewComment').value.trim();

  if (calificacion === 0) {
    showNotif('Por favor selecciona una calificación de estrellas', 'warning');
    return;
  }

  if (!productoSeleccionado || !productoSeleccionado.id) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Enviando...';

  try {
    const resultado = await APIService.crearResena(productoSeleccionado.id, calificacion, comentario);
    if (resultado.error) {
      throw new Error(resultado.error);
    }
    
    showNotif('¡Gracias por tu reseña!', 'success');
    document.getElementById('cancelReviewBtn').click();
    const btnShow = document.getElementById('btnShowReviewForm');
    if (btnShow) btnShow.style.display = 'inline-block';
    cargarResenasProducto(productoSeleccionado.id);
  } catch (e) {
    showNotif(e.message || 'Error al enviar la reseña', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Enviar Reseña';
  }
});

async function agregarAlCarrito(productoId) {
  const qtyEl = document.getElementById('productQty');
  const cantidad = qtyEl ? parseInt(qtyEl.value) : 1;
  return procesarAgregarCarrito(productoId, cantidad);
}

async function agregarAlCarritoDesdeTarjeta(productoId) {
  // Desde la tarjeta directamente SIEMPRE agregamos 1 unidad
  return procesarAgregarCarrito(productoId, 1);
}

async function procesarAgregarCarrito(productoId, cantidad) {
  const token = APIService.getToken();

  if (!token) {
    showNotif('Debes iniciar sesión para agregar al carrito');
    window.location.href = 'login.html';
    return;
  }

  try {
    const resultado = await APIService.agregarAlCarrito(productoId, cantidad);

    if (resultado.error) {
      showNotif(resultado.error);
      return;
    }

    showNotif('Producto agregado al carrito');
    actualizarBadgeCarrito();

    // Cerrar modal
    const modalEl = document.getElementById('productModal');
    const modal = modalEl && window.bootstrap?.Modal ? bootstrap.Modal.getInstance(modalEl) : null;
    if (modal) modal.hide();
  } catch (error) {
    showNotif('Error al agregar al carrito');
  }
}

// Exponer en scope global para los onclick inline generados por JS
window.abrirProducto = abrirProducto;
window.agregarAlCarritoDesdeTarjeta = agregarAlCarritoDesdeTarjeta;

