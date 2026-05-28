
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

// Carrito Manager - Gestión del carrito
document.addEventListener('DOMContentLoaded', async () => {
  const token = APIService.getToken();
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  if (usuario?.rol === 'admin') {
    window.location.href = 'panel-admin.html';
    return;
  }

  await cargarCarrito();
  configurarEventos();
});

async function cargarCarrito() {
  try {
    const carrito = await APIService.obtenerCarrito();
    actualizarTablaCarrito(carrito);
  } catch (error) {
    console.error('Error cargando carrito:', error);
    showNotif('Error al cargar el carrito');
  }
}

function actualizarTablaCarrito(carrito) {
  const tabla = document.getElementById('cartTableBody');
  const emptyCart = document.getElementById('emptyCart');
  const cartItems = document.getElementById('cartItems');

  if (!carrito.items || carrito.items.length === 0) {
    emptyCart.style.display = 'block';
    cartItems.style.display = 'none';
    const seccionPago = document.getElementById('seccion-pago');
    if (seccionPago) seccionPago.style.display = 'none';
    return;
  }

  emptyCart.style.display = 'none';
  cartItems.style.display = 'block';

  let html = '';
  carrito.items.forEach(item => {
    html += `
      <tr>
        <td>
          <div class="d-flex gap-3">
            ${item.imagen ? `<img src="${escapeHtml(item.imagen)}" style="width:50px; height:50px; object-fit:cover; border-radius:5px;" alt="${escapeHtml(item.nombre)}">` : ''}
            <div>
              <strong>${escapeHtml(item.nombre)}</strong>
            </div>
          </div>
        </td>
        <td>Bs ${item.precioUnitario.toFixed(2)}</td>
        <td>
          <input type="number" class="form-control form-control-sm" style="width:70px;"
                 value="${item.cantidad}" min="1" max="${item.stock}"
                 onchange="actualizarCantidad(${item.productoId}, this.value)">
        </td>
        <td>Bs ${item.subtotal.toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="eliminarDelCarrito(${item.productoId})">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });

  tabla.innerHTML = html;

  // Actualizar totales si existen
  const subtotalEl = document.getElementById('subtotal');
  const shippingEl = document.getElementById('shipping');
  const totalEl = document.getElementById('total');
  if (subtotalEl) subtotalEl.textContent = `Bs ${carrito.total.toFixed(2)}`;
  if (shippingEl) shippingEl.textContent = 'Bs 0.00';
  if (totalEl) totalEl.textContent = `Bs ${carrito.total.toFixed(2)}`;

  // Mostrar sección de pago y renderizar botón PayPal
  const seccionPago = document.getElementById('seccion-pago');
  if (seccionPago) {
    seccionPago.style.display = 'block';
    const totalPagoEl = document.getElementById('total-pago');
    if (totalPagoEl) totalPagoEl.textContent = `Bs ${carrito.total.toFixed(2)}`;
    // Ocultar mensajes previos al reinicializar
    const exitoso = document.getElementById('pago-exitoso');
    const error = document.getElementById('pago-error');
    if (exitoso) exitoso.style.display = 'none';
    if (error) error.style.display = 'none';
    if (typeof initPayPal === 'function') initPayPal(carrito.total);
  }
}

function configurarEventos() {
  document.getElementById('continueShopping')?.addEventListener('click', () => {
    window.location.href = 'productos.html';
  });

  const addressForm = document.getElementById('addressForm');
  if (addressForm) {
    addressForm.addEventListener('submit', procesarPago);
  }
}

async function actualizarCantidad(productoId, nuevaCantidad) {
  nuevaCantidad = parseInt(nuevaCantidad);

  if (nuevaCantidad < 1) {
    eliminarDelCarrito(productoId);
    return;
  }

  try {
    const resultado = await APIService.actualizarCarrito(productoId, nuevaCantidad);

    if (resultado.error) {
      showNotif(resultado.error);
      return;
    }

    await cargarCarrito();
  } catch (error) {
    showNotif('Error al actualizar el carrito');
  }
}

async function eliminarDelCarrito(productoId) {
  showConfirm('¿Deseas eliminar este producto?', async () => {
    try {
      const resultado = await APIService.eliminarDelCarrito(productoId);
      if (resultado.error) { showNotif(resultado.error, 'error'); return; }
      await cargarCarrito();
      actualizarBadgeCarrito();
      showNotif('Producto eliminado del carrito');
    } catch (error) {
      showNotif('Error al eliminar del carrito', 'error');
    }
  });
}

function irAlCheckout() {
  mostrarModalDireccion();
}

async function procesarPago(e) {
  e.preventDefault();

  const direccion = document.getElementById('address').value;
  const ciudad = document.getElementById('city').value;
  const telefono = document.getElementById('phone').value;

  if (!direccion || !ciudad || !telefono) {
    showNotif('Por favor completa todos los campos');
    return;
  }

  const direccionCompleta = `${direccion}, ${ciudad}. Tel: ${telefono}`;

  try {
    const resultado = await APIService.crearOrden(direccionCompleta);

    if (resultado.error) {
      showNotif(resultado.error);
      return;
    }

    // Guardar datos de la orden
    localStorage.setItem('ordenActual', JSON.stringify(resultado));

    // Cerrar modal
    ocultarModalDireccion();

    // Redirigir a confirmación
    window.location.href = `orden-confirmacion.html?id=${resultado.ordenId}`;
  } catch (error) {
    showNotif('Error al procesar el pago');
    console.error(error);
  }
}

function mostrarModalDireccion() {
  const modalEl = document.getElementById('addressModal');
  if (!modalEl) return;

  if (window.bootstrap?.Modal) {
    const modal = new window.bootstrap.Modal(modalEl);
    modal.show();
    return;
  }

  // Fallback sin Bootstrap JS (cuando el CDN no carga)
  modalEl.classList.add('show');
  modalEl.style.display = 'block';
  modalEl.removeAttribute('aria-hidden');
  modalEl.setAttribute('aria-modal', 'true');
  document.body.classList.add('modal-open');

  let backdrop = document.querySelector('.modal-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    document.body.appendChild(backdrop);
  }
}

function ocultarModalDireccion() {
  const modalEl = document.getElementById('addressModal');
  if (!modalEl) return;

  if (window.bootstrap?.Modal) {
    const instance = window.bootstrap.Modal.getOrCreateInstance(modalEl);
    instance.hide();
    return;
  }

  modalEl.classList.remove('show');
  modalEl.style.display = 'none';
  modalEl.setAttribute('aria-hidden', 'true');
  modalEl.removeAttribute('aria-modal');
  document.body.classList.remove('modal-open');

  const backdrop = document.querySelector('.modal-backdrop');
  if (backdrop) backdrop.remove();
}
