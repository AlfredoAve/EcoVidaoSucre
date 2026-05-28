// Productos Filter - Página de productos con filtros
let todosProductos = [];
let productoSeleccionado = null;
const usuarioActual = JSON.parse(localStorage.getItem('usuario') || 'null');
const esAdmin = usuarioActual?.rol === 'admin';
let favoritosIdsCatalogo = new Set();

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
  await cargarFavoritosIdsCatalogo();
  await cargarProductos();
  await cargarCategorias();
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

async function cargarProductos() {
  const container = document.getElementById('productsList');

  try {
    todosProductos = await APIService.obtenerProductos();
    renderizarProductos(todosProductos);
  } catch (error) {
    container.innerHTML = '<div class="col-12 text-danger">Error al cargar productos</div>';
  }
}

async function cargarCategorias() {
  const container = document.getElementById('categoriesList');

  try {
    const categorias = await APIService.obtenerCategorias();

    let html = '';
    categorias.forEach(cat => {
      html += `
        <div class="form-check">
          <input class="form-check-input categoria-filter" type="checkbox" value="${cat.id}" id="cat${cat.id}">
          <label class="form-check-label" for="cat${cat.id}">
            ${cat.nombre} <span class="text-muted small">(${cat.productosCount || 0})</span>
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

  // Filtro de categoría
  document.querySelectorAll('.categoria-filter').forEach(el => {
    el.addEventListener('change', aplicarFiltros);
  });

  // Filtro de precio
  document.getElementById('filterBtn')?.addEventListener('click', aplicarFiltros);

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
  const termino = document.getElementById('searchInput')?.value || '';
  const minPrice = parseFloat(document.getElementById('minPrice')?.value || 0);
  const maxPrice = parseFloat(document.getElementById('maxPrice')?.value || Infinity);

  const categoriasSeleccionadas = Array.from(document.querySelectorAll('.categoria-filter:checked')).map(el => parseInt(el.value));

  let filtrados = todosProductos.filter(p => {
    const cumpleBusqueda = p.nombre.toLowerCase().includes(termino.toLowerCase()) ||
                          p.descripcion?.toLowerCase().includes(termino.toLowerCase());
    const cumplePrecio = p.precio >= minPrice && p.precio <= maxPrice;
    const cumpleCategoria = categoriasSeleccionadas.length === 0 || categoriasSeleccionadas.includes(p.categoriaId);

    return cumpleBusqueda && cumplePrecio && cumpleCategoria;
  });

  const productsList = document.getElementById('productsList');
  const noResultsMsg = document.getElementById('noResultsMsg');

  if (filtrados.length === 0) {
    productsList.style.display = 'none';
    noResultsMsg.style.display = 'block';
  } else {
    productsList.style.display = '';
    noResultsMsg.style.display = 'none';
    renderizarProductos(filtrados);
  }
}

function aplicarFiltroDesdeURL() {
  const params = new URLSearchParams(window.location.search);
  const categoriaId = params.get('categoria');
  if (categoriaId) {
    const checkbox = document.getElementById(`cat${categoriaId}`);
    if (checkbox) {
      checkbox.checked = true;
      aplicarFiltros();
    }
  }
}

function limpiarFiltros() {
  document.getElementById('searchInput').value = '';
  document.getElementById('minPrice').value = '';
  document.getElementById('maxPrice').value = '';
  document.querySelectorAll('.categoria-filter').forEach(el => el.checked = false);
  
  const productsList = document.getElementById('productsList');
  productsList.style.display = '';
  document.getElementById('noResultsMsg').style.display = 'none';
  renderizarProductos(todosProductos);
}

function renderizarProductos(productos) {
  const container = document.getElementById('productsList');

  let html = '';
  productos.forEach(prod => {
    const enStock = prod.stock > 0;
    const esFavorito = favoritosIdsCatalogo.has(prod.id);
    html += `
      <div class="col-sm-6 col-md-4 col-lg-3">
        <div class="card h-100 border-0 eco-card">
          <div class="eco-card-img-wrapper">
            <img src="${APIService.getImageUrl(prod.imagen)}"
                 class="card-img-top eco-card-img"
                 alt="${escapeHtml(prod.nombre)}"
                 onerror="this.src='https://placehold.co/400x400/e9ecef/6c757d?text=Sin+Imagen';this.onerror=null;">
            <button class="fav-btn ${esFavorito ? 'active' : ''}" type="button" data-product-id="${prod.id}" aria-label="Favorito">
              <i class="bi ${esFavorito ? 'bi-heart-fill' : 'bi-heart'}"></i>
            </button>
          </div>
          <div class="card-body d-flex flex-column eco-card-body">
            <span class="eco-cat-label">${escapeHtml(prod.categoriaNombre || 'Natural')}</span>
            <h6 class="card-title fw-bold mb-1 eco-card-title">${escapeHtml(prod.nombre)}</h6>
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
    const imgEl = document.getElementById('productImage');
    imgEl.src = APIService.getImageUrl(productoSeleccionado.imagen);
    imgEl.onerror = function() { this.src = 'https://placehold.co/400x400/e9ecef/6c757d?text=Sin+Imagen'; this.onerror = null; };
    document.getElementById('productDesc').textContent = productoSeleccionado.descripcion || '';
    document.getElementById('productPrice').textContent = productoSeleccionado.precio.toFixed(2);
    document.getElementById('productStock').textContent = stock;
    document.getElementById('productQty').max = stock;
    document.getElementById('productQty').value = stock > 0 ? 1 : 0;

    if (addBtn) {
      addBtn.disabled = stock <= 0;
    }

    // Cargar reseñas
    await cargarResenasProducto(productoId);

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

async function cargarResenasProducto(productoId) {
  try {
    const data = await APIService.obtenerResenasProducto(productoId);
    const container = document.getElementById('resenaProducto');
    const usuarioLocal = JSON.parse(localStorage.getItem('usuario') || 'null');
    const puedeResenar = !!APIService.getToken() && usuarioLocal?.rol !== 'admin';

    let html = '';

    if (data.total > 0) {
      const promedio = Number(data.promedio).toFixed(1);
      html += `<div class="mb-2 small"><strong>Calificación:</strong> ${'⭐'.repeat(Math.round(data.promedio))} (${promedio}/5 — ${data.total} reseña${data.total !== 1 ? 's' : ''})</div>`;
      const recientes = (data.resenas || []).slice(0, 3);
      recientes.forEach(r => {
        html += `<div class="border-bottom pb-1 mb-1 small">
          <div class="d-flex justify-content-between">
            <strong>${escapeHtml(r.nombre || 'Cliente')}</strong>
            <span>${'⭐'.repeat(r.calificacion)}</span>
          </div>
          ${r.comentario ? `<p class="mb-0 text-muted">${escapeHtml(r.comentario)}</p>` : ''}
        </div>`;
      });
    } else {
      html += '<p class="text-muted small mb-1">Sin reseñas aún</p>';
    }

    if (puedeResenar) {
      html += `
        <hr class="my-2">
        <p class="fw-bold small mb-1">Escribe tu reseña</p>
        <div class="d-flex gap-1 mb-2" id="resenaStars" data-val="0">
          ${[1,2,3,4,5].map(n => `<span class="resena-star" data-n="${n}" style="cursor:pointer;font-size:1.5rem;user-select:none;">☆</span>`).join('')}
        </div>
        <textarea class="form-control form-control-sm mb-2" id="resenaComentario" rows="2" placeholder="Comentario (opcional)"></textarea>
        <button class="btn btn-success btn-sm" onclick="window.enviarResena(${productoId})">
          <i class="bi bi-star-fill"></i> Enviar reseña
        </button>
        <div id="resenaMsg" class="mt-1 small"></div>`;
    }

    container.innerHTML = html;

    if (puedeResenar) {
      container.querySelectorAll('.resena-star').forEach(star => {
        star.addEventListener('click', () => {
          const n = parseInt(star.dataset.n);
          document.getElementById('resenaStars').dataset.val = n;
          container.querySelectorAll('.resena-star').forEach((s, i) => {
            s.textContent = i < n ? '⭐' : '☆';
          });
        });
      });
    }
  } catch (error) {
    console.error('Error cargando reseñas:', error);
  }
}

async function enviarResena(productoId) {
  const calificacion = parseInt(document.getElementById('resenaStars')?.dataset.val || '0');
  const comentario = document.getElementById('resenaComentario')?.value || '';
  const msgEl = document.getElementById('resenaMsg');

  if (!calificacion) {
    msgEl.className = 'mt-1 small text-danger';
    msgEl.textContent = 'Selecciona una calificación (1-5 estrellas)';
    return;
  }

  try {
    const resultado = await APIService.crearResena(productoId, calificacion, comentario);
    if (resultado.error) {
      msgEl.className = 'mt-1 small text-danger';
      msgEl.textContent = resultado.error;
      return;
    }
    msgEl.className = 'mt-1 small text-success';
    msgEl.textContent = '¡Reseña enviada! Gracias.';
    await cargarResenasProducto(productoId);
  } catch (e) {
    msgEl.className = 'mt-1 small text-danger';
    msgEl.textContent = 'Error al enviar la reseña';
  }
}
window.enviarResena = enviarResena;

async function agregarAlCarrito(productoId) {
  return agregarAlCarritoDesdeTarjeta(productoId);
}

async function agregarAlCarritoDesdeTarjeta(productoId) {
  const token = APIService.getToken();

  if (!token) {
    showNotif('Debes iniciar sesión para agregar al carrito');
    window.location.href = 'login.html';
    return;
  }

  const qtyEl = document.getElementById('productQty');
  const cantidad = qtyEl ? parseInt(qtyEl.value) : 1;

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
