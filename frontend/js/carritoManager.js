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
    await actualizarTablaCarrito(carrito);
  } catch (error) {
    console.error('Error cargando carrito:', error);
    showNotif('Error al cargar el carrito');
  }
}

async function actualizarTablaCarrito(carrito) {
  const tabla = document.getElementById('cartTableBody');
  const emptyCart = document.getElementById('emptyCart');
  const cartItems = document.getElementById('cartItems');

  if (!carrito.items || carrito.items.length === 0) {
    emptyCart.style.display = 'block';
    cartItems.style.display = 'none';
    const seccionPago = document.getElementById('seccion-pago');
    if (seccionPago) seccionPago.style.display = 'none';
    // Resetear PayPal para que se pueda reinicializar si vuelven a agregar productos
    if (typeof paypalInicializado !== 'undefined') paypalInicializado = false;
    const container = document.getElementById('paypal-button-container');
    if (container) container.innerHTML = '';
    return;
  }

  emptyCart.style.display = 'none';
  cartItems.style.display = 'block';

  let html = '';
  carrito.items.forEach(item => {
    const precioUnitario = Number(item.precioUnitario || 0);
    const subtotal = Number(item.subtotal || 0);
    const stock = Number(item.stock || 0);
    html += `
      <tr>
        <td>
          <div class="d-flex gap-3">
            <img src="${APIService.getImageUrl(item.imagen)}" style="width:50px; height:50px; object-fit:cover; border-radius:5px;" alt="${escapeHtml(item.nombre)}" loading="lazy" decoding="async" width="50" height="50" onerror="this.src='https://placehold.co/400x400/e9ecef/6c757d?text=Sin+Imagen';this.onerror=null;">
            <div>
              <strong>${escapeHtml(item.nombre)}</strong>
            </div>
          </div>
        </td>
        <td>Bs ${precioUnitario.toFixed(2)}</td>
        <td>
          <input type="number" class="form-control form-control-sm" style="width:70px;"
                 value="${item.cantidad}" min="1" max="${stock}"
                 onchange="actualizarCantidad(${item.productoId}, this.value)">
        </td>
        <td>Bs ${subtotal.toFixed(2)}</td>
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
  const total = Number(carrito.total || 0);
  if (subtotalEl) subtotalEl.textContent = `Bs ${total.toFixed(2)}`;
  if (shippingEl) shippingEl.textContent = 'Bs 0.00';
  if (totalEl) totalEl.textContent = `Bs ${total.toFixed(2)}`;

  // Mostrar sección de pago y renderizar botón PayPal
  const seccionPago = document.getElementById('seccion-pago');
  if (seccionPago) {
    seccionPago.style.display = 'block';
    const totalPagoEl = document.getElementById('total-pago');
    if (totalPagoEl) totalPagoEl.textContent = `Bs ${total.toFixed(2)}`;
    // Ocultar mensajes previos al reinicializar
    const exitoso = document.getElementById('pago-exitoso');
    const error = document.getElementById('pago-error');
    if (exitoso) exitoso.style.display = 'none';
    if (error) error.style.display = 'none';

    const avisoPerfil = document.getElementById('perfil-pago-incompleto');
    const botonContraentrega = document.getElementById('btn-contraentrega');
    const paypalContainer = document.getElementById('paypal-button-container');

    try {
      const validacionPerfil = await obtenerValidacionPerfilPago();
      if (!validacionPerfil.completo) {
        mostrarPerfilIncompleto(validacionPerfil);
        if (paypalContainer) paypalContainer.innerHTML = '';
        if (botonContraentrega) botonContraentrega.disabled = true;
        paypalInicializado = false;
        return;
      }

      if (avisoPerfil) avisoPerfil.style.display = 'none';
      if (botonContraentrega) botonContraentrega.disabled = false;
      if (typeof initPayPal === 'function') initPayPal(total);
    } catch (perfilError) {
      console.error('Error validando perfil para pago:', perfilError);
      mostrarPerfilIncompleto({ camposFaltantes: [] });
      if (paypalContainer) paypalContainer.innerHTML = '';
      if (botonContraentrega) botonContraentrega.disabled = true;
      paypalInicializado = false;
    }
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
  nuevaCantidad = Number(nuevaCantidad);

  if (!Number.isInteger(nuevaCantidad) || nuevaCantidad < 1) {
    showNotif('Ingresa una cantidad válida');
    await cargarCarrito();
    return;
  }

  try {
    const producto = await APIService.obtenerProductoPorId(productoId);
    const stockDisponible = Number(producto.stock || 0);

    if (nuevaCantidad > stockDisponible) {
      nuevaCantidad = stockDisponible;
      showNotif(`Solo hay ${stockDisponible} unidades disponibles`);
    }

    if (nuevaCantidad < 1) {
      nuevaCantidad = 1;
    }

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

  let validacionPerfil;
  try {
    validacionPerfil = await obtenerValidacionPerfilPago();
  } catch (error) {
    console.error('Error validando perfil para pago:', error);
    showNotif('No se pudo validar tu perfil. Intenta nuevamente.', 'error');
    return;
  }

  if (!validacionPerfil.completo) {
    ocultarModalDireccion();
    mostrarPerfilIncompleto(validacionPerfil);
    showNotif('Completa tu perfil antes de pagar', 'warning');
    return;
  }

  const direccion = document.getElementById('address').value.trim();
  const ciudad = document.getElementById('city').value.trim();
  const telefono = document.getElementById('phone').value.trim();

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

  // Pre-llenar datos del usuario si están disponibles
  APIService.obtenerPerfil().then(usuario => {
    if (usuario) {
      if (document.getElementById('address') && !document.getElementById('address').value) {
        document.getElementById('address').value = usuario.direccion || '';
      }
      if (document.getElementById('city') && !document.getElementById('city').value) {
        document.getElementById('city').value = usuario.ciudad || '';
      }
      if (document.getElementById('phone') && !document.getElementById('phone').value) {
        document.getElementById('phone').value = usuario.telefono || '';
      }
    }
  }).catch(err => console.error('Error pre-llenando dirección:', err));

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
