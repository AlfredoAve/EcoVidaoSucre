// Main - Página principal
const usuarioActualHome = JSON.parse(localStorage.getItem('usuario') || 'null');
const esAdminHome = usuarioActualHome?.rol === 'admin';
let favoritosIdsHome = new Set();
let productoSeleccionadoHome = null;
let bootstrapHomeUnavailable = false;

function renderHomeProductSkeletons(count = 4) {
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

function renderHomeCategorySkeletons(count = 4) {
  return Array.from({ length: count }, () => `
    <div class="col-6 col-md-4 col-lg-3">
      <div class="skeleton-category-card" aria-hidden="true">
        <div class="skeleton-media"></div>
        <div class="skeleton-body">
          <div class="skeleton-line is-title mx-auto"></div>
          <div class="skeleton-line is-short mx-auto"></div>
        </div>
      </div>
    </div>
  `).join('');
}

async function ensureBootstrapHome() {
  if (window.bootstrap?.Modal) return true;
  if (bootstrapHomeUnavailable) return false;

  const existing = document.querySelector('script[data-bootstrap]');
  if (existing) {
    if (existing.dataset.bootstrapFailed === 'true') {
      bootstrapHomeUnavailable = true;
      return false;
    }

    return new Promise(resolve => {
      const done = ok => {
        if (!ok) {
          existing.dataset.bootstrapFailed = 'true';
          bootstrapHomeUnavailable = true;
        }
        resolve(Boolean(ok && window.bootstrap?.Modal));
      };

      const timer = setTimeout(() => done(false), 1200);
      existing.addEventListener('load', () => {
        clearTimeout(timer);
        done(true);
      }, { once: true });
      existing.addEventListener('error', () => {
        clearTimeout(timer);
        done(false);
      }, { once: true });
    });
  }

  return new Promise(resolve => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/bootstrap.bundle.min.js';
    script.defer = true;
    script.dataset.bootstrap = 'true';
    const done = ok => {
      if (!ok) {
        script.dataset.bootstrapFailed = 'true';
        bootstrapHomeUnavailable = true;
      }
      resolve(Boolean(ok && window.bootstrap?.Modal));
    };
    const timer = setTimeout(() => done(false), 1200);
    script.onload = () => {
      clearTimeout(timer);
      done(true);
    };
    script.onerror = () => {
      clearTimeout(timer);
      done(false);
    };
    document.head.appendChild(script);
  });
}

async function mostrarModalProductoHome() {
  const modalEl = document.getElementById('productModal');
  if (!modalEl) return;

  const bootstrapReady = await ensureBootstrapHome();
  if (bootstrapReady && window.bootstrap?.Modal) {
    window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
    return;
  }

  modalEl.style.display = 'block';
  modalEl.removeAttribute('aria-hidden');
  modalEl.setAttribute('aria-modal', 'true');
  modalEl.classList.add('show');
  document.body.classList.add('modal-open');

  if (!document.querySelector('.modal-backdrop.eco-fallback-backdrop')) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show eco-fallback-backdrop';
    backdrop.addEventListener('click', cerrarModalProductoHome);
    document.body.appendChild(backdrop);
  }
}

function cerrarModalProductoHome() {
  const modalEl = document.getElementById('productModal');
  if (!modalEl) return;

  if (window.bootstrap?.Modal) {
    const modal = window.bootstrap.Modal.getInstance(modalEl);
    if (modal) {
      modal.hide();
    }
  }

  modalEl.classList.remove('show');
  modalEl.style.display = 'none';
  modalEl.setAttribute('aria-hidden', 'true');
  modalEl.removeAttribute('aria-modal');
  document.body.classList.remove('modal-open');
  document.querySelectorAll('.modal-backdrop.eco-fallback-backdrop').forEach(backdrop => backdrop.remove());
}

document.addEventListener('DOMContentLoaded', async () => {
  // Cargar favoritos primero para que las tarjetas se rendericen con el estado correcto.
  await cargarFavoritosIdsHome();
  await Promise.all([cargarCategorias(), cargarProductosDestacados()]);
  initHeroCarousel();
  configurarModalProductoDestacado();
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
    container.innerHTML = renderHomeCategorySkeletons();
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
                 decoding="async"
                 width="900"
                 height="507"
                 sizes="(max-width: 575px) calc(100vw - 32px), (max-width: 767px) 50vw, (max-width: 991px) 33vw, 25vw"
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
    container.innerHTML = renderHomeProductSkeletons();
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
                <span class="badge-stock ${enStockH ? 'stock-ok' : 'stock-no'}">${enStockH ? 'En stock' : 'Sin stock'}</span>
              </div>
              <div class="d-flex gap-2 mt-auto eco-btn-row">
                <button class="btn btn-outline-secondary btn-sm flex-grow-1 eco-btn-ver" data-featured-product-id="${prod.id}" type="button">
                  Ver más
                </button>
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
    container.addEventListener('click', onProductosDestacadosClick);
  } catch (error) {
    console.error('Error cargando productos:', error);
    container.innerHTML = '<div class="col-12 text-danger text-center">Error al cargar productos</div>';
  }
}

async function onProductosDestacadosClick(event) {
  const detailBtn = event.target.closest('[data-featured-product-id]');
  if (detailBtn) {
    event.preventDefault();
    await abrirProductoDestacado(Number(detailBtn.dataset.featuredProductId));
    return;
  }

  await onFavoritoHomeClick(event);
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

function getModalStockInfo(stock) {
  if (stock <= 0) {
    return {
      label: 'Sin stock',
      className: 'is-out',
      hint: '<i class="bi bi-x-circle"></i> No disponible por ahora'
    };
  }
  if (stock <= 5) {
    return {
      label: 'Últimas unidades',
      className: 'is-low',
      hint: '<i class="bi bi-lightning-charge"></i> Quedan pocas unidades'
    };
  }
  return {
    label: 'Disponible',
    className: 'is-ready',
    hint: '<i class="bi bi-check2-circle"></i> Listo para comprar'
  };
}

function configurarCantidadModal(stock) {
  const qty = document.getElementById('productQty');
  const minusBtn = document.getElementById('qtyMinusBtn');
  const plusBtn = document.getElementById('qtyPlusBtn');
  if (!qty) return;

  const maxStock = Math.max(0, Number(stock || 0));
  qty.max = maxStock;
  qty.value = maxStock > 0 ? 1 : 0;

  const syncButtons = () => {
    const value = Number(qty.value || 0);
    if (minusBtn) minusBtn.disabled = value <= 1 || maxStock <= 0;
    if (plusBtn) plusBtn.disabled = value >= maxStock || maxStock <= 0;
  };

  if (minusBtn) {
    minusBtn.onclick = () => {
      qty.value = Math.max(1, Number(qty.value || 1) - 1);
      syncButtons();
    };
  }

  if (plusBtn) {
    plusBtn.onclick = () => {
      qty.value = Math.min(maxStock, Number(qty.value || 0) + 1);
      syncButtons();
    };
  }

  qty.oninput = () => {
    const raw = Number(qty.value || 0);
    qty.value = maxStock > 0 ? Math.min(maxStock, Math.max(1, raw)) : 0;
    syncButtons();
  };

  syncButtons();
}

function configurarFavoritoModalHome(productoId) {
  const favBtn = document.getElementById('modalFavoriteBtn');
  if (!favBtn) return;
  const esFavorito = favoritosIdsHome.has(productoId);
  favBtn.classList.toggle('active', esFavorito);
  favBtn.setAttribute('aria-label', esFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos');
  favBtn.innerHTML = `
    <span class="modal-favorite-icon"><i class="bi ${esFavorito ? 'bi-heart-fill' : 'bi-heart'}"></i></span>
  `;
  favBtn.onclick = async () => {
    if (!APIService.getToken()) {
      showNotif('Debes iniciar sesión para guardar favoritos');
      window.location.href = 'login.html';
      return;
    }

    const activo = favBtn.classList.contains('active');
    const resultado = activo
      ? await APIService.eliminarFavorito(productoId)
      : await APIService.agregarFavorito(productoId);

    if (resultado?.error) {
      showNotif(resultado.error);
      return;
    }

    if (activo) {
      favoritosIdsHome.delete(productoId);
    } else {
      favoritosIdsHome.add(productoId);
    }

    configurarFavoritoModalHome(productoId);
    document.querySelectorAll(`.fav-btn[data-product-id="${productoId}"]`).forEach(btn => {
      btn.classList.toggle('active', !activo);
      btn.innerHTML = `<i class="bi ${!activo ? 'bi-heart-fill' : 'bi-heart'}"></i>`;
    });
  };
}

async function abrirProductoDestacado(productoId) {
  try {
    productoSeleccionadoHome = await APIService.obtenerProductoPorId(productoId);

    if (!productoSeleccionadoHome || productoSeleccionadoHome.error) {
      throw new Error(productoSeleccionadoHome?.error || 'Producto no encontrado');
    }

    const stock = Number(productoSeleccionadoHome.stock || 0);
    const addBtn = document.getElementById('addToCartBtn');
    const qty = document.getElementById('productQty');

    document.getElementById('productTitle').textContent = productoSeleccionadoHome.nombre;
    document.getElementById('productCategory').textContent = productoSeleccionadoHome.categoriaNombre || 'Producto natural';
    document.getElementById('productRatingSummary').innerHTML = renderProductRating(
      productoSeleccionadoHome.promedioResenas,
      productoSeleccionadoHome.totalResenas
    );

    const imgEl = document.getElementById('productImage');
    imgEl.src = APIService.getImageUrl(productoSeleccionadoHome.imagen);
    imgEl.onerror = function () {
      this.src = 'https://placehold.co/400x400/e9ecef/6c757d?text=Sin+Imagen';
      this.onerror = null;
    };

    document.getElementById('productDesc').textContent = productoSeleccionadoHome.descripcion || '';
    document.getElementById('productPrice').textContent = Number(productoSeleccionadoHome.precio || 0).toFixed(2);
    document.getElementById('productStock').textContent = stock;

    const stockInfo = getModalStockInfo(stock);
    const stockBadge = document.getElementById('productStockBadge');
    if (stockBadge) {
      stockBadge.textContent = stockInfo.label;
      stockBadge.className = `modal-stock-badge ${stockInfo.className}`;
    }
    const stockHint = document.getElementById('productStockHint');
    if (stockHint) stockHint.innerHTML = stockInfo.hint;
    configurarCantidadModal(stock);
    configurarFavoritoModalHome(productoId);

    const beneficios = Array.isArray(productoSeleccionadoHome.beneficios) ? productoSeleccionadoHome.beneficios : [];
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
      addBtn.innerHTML = stock > 0
        ? '<i class="bi bi-bag-plus fs-5 me-2"></i> Añadir al carrito'
        : '<i class="bi bi-slash-circle fs-5 me-2"></i> Sin stock';
      addBtn.onclick = () => agregarProductoDestacado(productoId, Number(qty?.value || 1), true);
    }

    await cargarResenasProductoDestacado(productoId);
    await configurarAccionesResena(productoId);
    resetearFormularioResena();

    await mostrarModalProductoHome();
  } catch (error) {
    console.error('Error al cargar el producto destacado:', error);
    showNotif(error?.message || 'Error al cargar el producto');
  }
}

async function cargarResenasProductoDestacado(productoId) {
  const container = document.getElementById('resenaProducto');
  if (!container) return;

  try {
    const data = await APIService.obtenerResenasProducto(productoId);
    if (Number(data.total || 0) <= 0) {
      container.innerHTML = `
        <div class="review-empty-state">
          <i class="bi bi-chat-heart"></i>
          <h6 class="text-dark fw-bold mb-1">Aún no hay reseñas</h6>
          <p class="text-muted text-sm mb-0">¡Sé el primero en calificar este producto!</p>
        </div>
      `;
      return;
    }

    const promedio = Number(data.promedio || 0).toFixed(1);
    const resumen = `<div class="mb-4 small"><strong>Calificación General:</strong> <span class="text-warning" style="font-size:1.1rem;">${'★'.repeat(Math.round(data.promedio || 0))}</span> (${promedio}/5 - ${data.total} reseña${data.total !== 1 ? 's' : ''})</div>`;
    const resenas = (data.resenas || []).map(r => {
      const estrellas = '<i class="bi bi-star-fill"></i>'.repeat(r.calificacion) + '<i class="bi bi-star"></i>'.repeat(5 - r.calificacion);
      return `
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
    }).join('');

    container.innerHTML = resumen + resenas;
  } catch (error) {
    console.error('Error cargando reseñas:', error);
    container.innerHTML = '<div class="text-muted small">No se pudieron cargar las reseñas.</div>';
  }
}

async function configurarAccionesResena(productoId) {
  const btnShowReview = document.getElementById('btnShowReviewForm');
  const btnLoginReview = document.getElementById('btnLoginToReview');
  const usuarioLocal = JSON.parse(localStorage.getItem('usuario') || 'null');

  if (APIService.getToken() && usuarioLocal?.rol !== 'admin') {
    const elegibilidad = await APIService.puedeResenarProducto(productoId);
    if (btnShowReview) btnShowReview.style.display = elegibilidad.puedeResenar ? 'inline-block' : 'none';
    if (btnLoginReview) btnLoginReview.style.display = 'none';
  } else if (APIService.getToken()) {
    if (btnShowReview) btnShowReview.style.display = 'none';
    if (btnLoginReview) btnLoginReview.style.display = 'none';
  } else {
    if (btnShowReview) btnShowReview.style.display = 'none';
    if (btnLoginReview) btnLoginReview.style.display = 'inline-block';
  }
}

function resetearFormularioResena() {
  const reviewContainer = document.getElementById('reviewFormContainer');
  const reviewComment = document.getElementById('reviewComment');
  const submitBtn = document.getElementById('submitReviewBtn');

  if (reviewContainer) reviewContainer.style.display = 'none';
  if (reviewComment) reviewComment.value = '';
  if (submitBtn) submitBtn.setAttribute('data-calificacion', '0');
  document.querySelectorAll('#starRatingContainer i').forEach(star => {
    star.classList.add('bi-star');
    star.classList.remove('bi-star-fill');
  });
}

async function agregarProductoDestacado(productoId, cantidad = 1, cerrarModal = false) {
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

    if (cerrarModal) {
      cerrarModalProductoHome();
    }
  } catch (error) {
    showNotif('Error al agregar al carrito');
  }
}

function configurarModalProductoDestacado() {
  document.querySelectorAll('#productModal [data-bs-dismiss="modal"], #productModal .btn-close').forEach(btn => {
    btn.addEventListener('click', cerrarModalProductoHome);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.getElementById('productModal')?.classList.contains('show')) {
      cerrarModalProductoHome();
    }
  });

  const btnShowReview = document.getElementById('btnShowReviewForm');
  const cancelReviewBtn = document.getElementById('cancelReviewBtn');
  const submitReviewBtn = document.getElementById('submitReviewBtn');
  const stars = document.querySelectorAll('#starRatingContainer i');

  btnShowReview?.addEventListener('click', () => {
    const container = document.getElementById('reviewFormContainer');
    if (container) container.style.display = 'block';
    btnShowReview.style.display = 'none';
  });

  cancelReviewBtn?.addEventListener('click', () => {
    resetearFormularioResena();
    if (btnShowReview && APIService.getToken() && !esAdminHome) {
      btnShowReview.style.display = 'inline-block';
    }
  });

  stars.forEach(star => {
    star.addEventListener('mouseover', event => pintarEstrellas(Number(event.target.dataset.val || 0)));
    star.addEventListener('mouseout', () => pintarEstrellas(Number(submitReviewBtn?.dataset.calificacion || 0)));
    star.addEventListener('click', event => {
      if (submitReviewBtn) submitReviewBtn.dataset.calificacion = event.target.dataset.val || '0';
      pintarEstrellas(Number(event.target.dataset.val || 0));
    });
  });

  submitReviewBtn?.addEventListener('click', async () => {
    const calificacion = Number(submitReviewBtn.dataset.calificacion || 0);
    const comentario = document.getElementById('reviewComment')?.value.trim() || '';

    if (calificacion <= 0) {
      showNotif('Por favor selecciona una calificación de estrellas', 'warning');
      return;
    }

    if (!productoSeleccionadoHome?.id) return;

    submitReviewBtn.disabled = true;
    submitReviewBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Enviando...';

    try {
      const resultado = await APIService.crearResena(productoSeleccionadoHome.id, calificacion, comentario);
      if (resultado.error) throw new Error(resultado.error);

      showNotif('¡Gracias por tu reseña!', 'success');
      resetearFormularioResena();
      await cargarResenasProductoDestacado(productoSeleccionadoHome.id);
      await configurarAccionesResena(productoSeleccionadoHome.id);
    } catch (error) {
      showNotif(error.message || 'Error al enviar la reseña', 'error');
    } finally {
      submitReviewBtn.disabled = false;
      submitReviewBtn.innerHTML = 'Enviar Reseña';
    }
  });
}

function pintarEstrellas(valor) {
  document.querySelectorAll('#starRatingContainer i').forEach(star => {
    const activa = Number(star.dataset.val || 0) <= valor;
    star.classList.toggle('bi-star-fill', activa);
    star.classList.toggle('bi-star', !activa);
  });
}
