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
  await cargarConteoNotificaciones();

  const tabInicial = new URLSearchParams(window.location.search).get('tab');
  if (['perfil', 'ordenes', 'notificaciones', 'resenas', 'favoritos'].includes(tabInicial)) {
    cambiarTab(tabInicial);
  }
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
  document.getElementById('markAllNotificationsBtn')?.addEventListener('click', marcarTodasNotificacionesLeidas);

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
  } else if (tabName === 'notificaciones') {
    cargarNotificaciones();
  } else if (tabName === 'resenas') {
    cargarResenas();
  } else if (tabName === 'favoritos') {
    cargarFavoritos();
  }
}

const ESTADOS_ORDEN = {
  pendiente: { label: 'Pendiente', badge: 'bg-warning text-dark' },
  confirmada: { label: 'Confirmada', badge: 'bg-info text-dark' },
  enviado: { label: 'Enviada', badge: 'bg-primary' },
  entregado: { label: 'Recibida', badge: 'bg-success' },
  completada: { label: 'Completada', badge: 'bg-success' },
  cancelada: { label: 'Cancelada', badge: 'bg-danger' }
};

function renderPagoCliente(orden) {
  const estadoPago = orden.estadoPago === 'pagado' ? 'pagado' : 'pendiente';
  const metodo = orden.metodoPago === 'paypal' ? 'PayPal' : 'Contra entrega';
  const badge = estadoPago === 'pagado' ? 'bg-success' : 'bg-warning text-dark';
  const label = estadoPago === 'pagado' ? 'Pagado' : 'Pago pendiente';
  return `<span class="badge ${badge}">${label}</span> <small class="text-muted">${metodo}</small>`;
}

function renderTimelineOrden(estado) {
  const estadoVisual = estado === 'entrega_reportada' ? 'enviado' : estado;
  const pasos = [
    ['confirmada', 'Confirmada'],
    ['enviado', 'Enviada'],
    ['entregado', 'Recibida']
  ];
  const ordenEstados = ['pendiente', 'confirmada', 'enviado', 'entregado', 'completada'];
  const posicion = ordenEstados.indexOf(estadoVisual);

  if (estado === 'cancelada') {
    return '<div class="order-timeline-cancelled"><i class="bi bi-x-circle"></i> Orden cancelada</div>';
  }

  return `
    <div class="order-timeline">
      ${pasos.map(([clave, etiqueta]) => {
        const activo = posicion >= ordenEstados.indexOf(clave);
        return `<div class="order-timeline-step ${activo ? 'is-complete' : ''}">
          <span class="order-timeline-dot"><i class="bi bi-check-lg"></i></span>
          <span>${etiqueta}</span>
        </div>`;
      }).join('')}
    </div>
  `;
}

function renderResumenOrdenesCliente(ordenes) {
  const summary = document.getElementById('ordenesSummary');
  if (!summary) return;

  const total = ordenes.length;
  const activas = ordenes.filter(o => ['pendiente', 'confirmada', 'enviado'].includes(o.estado)).length;
  const porConfirmar = ordenes.filter(o => o.estado === 'enviado').length;
  const recibidas = ordenes.filter(o => ['entregado', 'completada'].includes(o.estado)).length;

  summary.innerHTML = `
    <div class="client-order-kpis">
      <div class="client-order-kpi">
        <span>Total pedidos</span>
        <strong>${total}</strong>
      </div>
      <div class="client-order-kpi">
        <span>En proceso</span>
        <strong>${activas}</strong>
      </div>
      <div class="client-order-kpi ${porConfirmar ? 'is-attention' : ''}">
        <span>Por confirmar</span>
        <strong>${porConfirmar}</strong>
      </div>
      <div class="client-order-kpi">
        <span>Recibidos</span>
        <strong>${recibidas}</strong>
      </div>
    </div>
  `;
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
              <img src="${APIService.getImageUrl(prod.imagen)}"
                   class="card-img-top eco-card-img"
                   alt="${escapeHtml(prod.nombre)}"
                   onerror="this.src='https://placehold.co/400x400/e9ecef/6c757d?text=Sin+Imagen';this.onerror=null;">
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
    nombre: document.getElementById('nombre').value.trim(),
    telefono: document.getElementById('telefono').value.trim(),
    ciudad: document.getElementById('ciudad').value.trim(),
    direccion: document.getElementById('direccion').value.trim()
  };

  const faltantes = Object.entries({
    nombre: datos.nombre,
    teléfono: datos.telefono,
    ciudad: datos.ciudad,
    dirección: datos.direccion
  }).filter(([, valor]) => !valor).map(([campo]) => campo);

  if (faltantes.length) {
    document.getElementById('errorMsg').textContent = `Completa los campos obligatorios: ${faltantes.join(', ')}.`;
    document.getElementById('errorMsg').style.display = 'block';
    return;
  }

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
    const usuarioLocal = JSON.parse(localStorage.getItem('usuario') || 'null');
    if (usuarioLocal) {
      usuarioLocal.nombre = datos.nombre;
      localStorage.setItem('usuario', JSON.stringify(usuarioLocal));
    }
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
      renderResumenOrdenesCliente([]);
      container.innerHTML = '<p class="text-muted">No tienes órdenes aún</p>';
      return;
    }

    renderResumenOrdenesCliente(ordenes);

    let html = '';
    ordenes.forEach(orden => {
      const estado = ESTADOS_ORDEN[orden.estado] || { label: orden.estado, badge: 'bg-secondary' };
      const productosOrden = Array.isArray(orden.productos) ? orden.productos : [];
      const resumenProductos = productosOrden
        .slice(0, 2)
        .map(p => `${escapeHtml(p.nombre)} x${Number(p.cantidad || 0)}`)
        .join(' · ');
      const extrasProductos = productosOrden.length > 2 ? ` +${productosOrden.length - 2} más` : '';
      const seguimiento = orden.numeroSeguimiento
        ? `<p class="mb-1 text-muted small"><strong>Seguimiento:</strong> ${escapeHtml(orden.numeroSeguimiento)}</p>`
        : '';
      const textoConfirmar = orden.metodoPago === 'contraentrega'
        ? 'Confirmar recepción y pago en efectivo'
        : 'Confirmar que recibí mi pedido';
      const confirmarRecepcion = orden.estado === 'enviado'
        ? `<button class="btn btn-sm btn-success" onclick="window.confirmarRecepcionOrden(${orden.id})">
            <i class="bi bi-box2-heart"></i> ${textoConfirmar}
          </button>`
        : '';
      const mensajeProblema = encodeURIComponent(`Hola EcoVida, necesito ayuda con mi orden #${orden.id}.`);

      html += `
        <div class="order-client-card">
          <div class="order-client-head">
            <div>
              <span class="order-client-id">Orden #${orden.id}</span>
              <p class="order-client-date mb-0">${new Date(orden.fechaCreacion).toLocaleDateString()}</p>
            </div>
            <span class="badge ${estado.badge}">${escapeHtml(estado.label)}</span>
          </div>
          <div class="order-client-body">
            <div>
              <p class="order-client-products">${resumenProductos || 'Productos del pedido'}${extrasProductos}</p>
              <p class="mb-1 text-muted small">Pago: ${renderPagoCliente(orden)}</p>
              <p class="mb-1 text-muted small">Envío a: ${escapeHtml(orden.direccionEnvio)}</p>
              ${seguimiento}
            </div>
            <div class="order-client-total">
              <span>Total</span>
              <strong>Bs ${Number(orden.total || 0).toFixed(2)}</strong>
            </div>
          </div>
          ${renderTimelineOrden(orden.estado)}
          <div class="order-client-actions">
            ${confirmarRecepcion}
            <button class="btn btn-sm btn-outline-primary" onclick="window.verDetalleOrdenCliente(${orden.id})">
              <i class="bi bi-eye"></i> Ver detalle
            </button>
            <button class="btn btn-sm btn-outline-secondary" onclick="window.descargarFacturaCliente(${orden.id})">
              <i class="bi bi-file-earmark-pdf"></i> Descargar Factura
            </button>
            <a class="btn btn-sm btn-outline-danger" href="https://wa.me/59175442968?text=${mensajeProblema}" target="_blank" rel="noopener noreferrer">
              <i class="bi bi-exclamation-circle"></i> Reportar un problema
            </a>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (error) {
    console.error('Error cargando órdenes:', error);
    container.innerHTML = '<p class="text-danger">Error al cargar órdenes</p>';
  }
}

window.confirmarRecepcionOrden = function(ordenId) {
  showConfirm('¿Confirmas que recibiste tu pedido? Si fue contra entrega, también confirmas que pagaste en efectivo.', async () => {
    try {
      const resultado = await APIService.confirmarRecepcionOrden(ordenId);
      if (resultado.error) {
        showNotif(resultado.error, 'error');
        return;
      }
      showNotif(resultado.mensaje || 'Recepción confirmada', 'success');
      await cargarOrdenes();
      await cargarConteoNotificaciones();
    } catch (error) {
      showNotif('No se pudo confirmar la recepción', 'error');
    }
  });
};

async function cargarConteoNotificaciones() {
  try {
    const data = await APIService.obtenerNotificacionesNoLeidas();
    const badge = document.getElementById('profileNotificationCount');
    if (!badge) return;
    const total = Number(data.total) || 0;
    badge.textContent = total;
    badge.style.display = total > 0 ? 'inline-block' : 'none';
  } catch (error) {
    console.error('Error cargando conteo de notificaciones:', error);
  }
}

async function cargarNotificaciones() {
  const container = document.getElementById('notificacionesList');
  if (!container) return;
  container.innerHTML = '<div class="spinner-border" role="status"></div>';

  try {
    const data = await APIService.obtenerNotificaciones();
    const notificaciones = data.notificaciones || [];
    if (!notificaciones.length) {
      container.innerHTML = '<p class="text-muted mb-0">No tienes notificaciones todavía.</p>';
      return;
    }

    container.innerHTML = notificaciones.map(notificacion => `
      <button class="notification-item ${notificacion.leida ? '' : 'is-unread'}"
              type="button"
              onclick="window.abrirNotificacion(${notificacion.id}, '${escapeHtml(notificacion.enlace || '')}')">
        <span class="notification-icon"><i class="bi bi-bell${notificacion.leida ? '' : '-fill'}"></i></span>
        <span class="notification-content">
          <strong>${escapeHtml(notificacion.mensaje)}</strong>
          <small>${new Date(notificacion.fechaCreacion).toLocaleString()}</small>
        </span>
      </button>
    `).join('');
  } catch (error) {
    container.innerHTML = '<p class="text-danger">No se pudieron cargar las notificaciones.</p>';
  }
}

window.abrirNotificacion = async function(id, enlace) {
  await APIService.marcarNotificacionLeida(id);
  await cargarConteoNotificaciones();
  if (enlace) {
    window.location.href = enlace;
  } else {
    cargarNotificaciones();
  }
};

async function marcarTodasNotificacionesLeidas() {
  await APIService.marcarTodasNotificacionesLeidas();
  await cargarConteoNotificaciones();
  await cargarNotificaciones();
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

window.descargarFacturaCliente = async function(ordenId) {
  try {
    showNotif('Generando factura...', 'info');
    await APIService.descargarFactura(ordenId);
  } catch (error) {
    console.error(error);
    showNotif(error.message || 'Error al descargar la factura', 'error');
  }
};

window.verDetalleOrdenCliente = async function(ordenId) {
  try {
    const orden = await APIService.obtenerOrdenPorId(ordenId);
    if (orden.error) throw new Error(orden.error);
    
    let modalEl = document.getElementById('clientOrderDetailModal');
    if (!modalEl) {
      const html = `
        <div class="modal fade" id="clientOrderDetailModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title fw-bold">Detalle de Orden #<span id="clientOrdId"></span></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <p class="mb-1 text-muted small">Estado: <strong id="clientOrdEstado" class="text-dark"></strong></p>
                <p class="mb-1 text-muted small">Pago: <span id="clientOrdPago"></span></p>
                <p class="mb-1 text-muted small">Teléfono: <span id="clientOrdTelefono"></span></p>
                <p class="mb-1 text-muted small">Dirección: <span id="clientOrdEnvio"></span></p>
                <p class="mb-3 text-muted small">Seguimiento: <span id="clientOrdTracking"></span></p>
                <div class="table-responsive">
                  <table class="table table-sm align-middle">
                    <thead class="table-light">
                      <tr>
                        <th>Producto</th>
                        <th>Cant.</th>
                        <th>Precio Unit.</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody id="clientOrdProducts"></tbody>
                    <tfoot class="table-light fw-bold">
                      <tr>
                        <td colspan="3" class="text-end">Total:</td>
                        <td id="clientOrdTotal"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div class="mt-4">
                  <h6 class="fw-bold">Historial de la orden</h6>
                  <div id="clientOrdHistory"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', html);
      modalEl = document.getElementById('clientOrderDetailModal');
    }

    document.getElementById('clientOrdId').textContent = orden.id;
    document.getElementById('clientOrdEstado').textContent = (orden.estado || '').toUpperCase();
    const pagoClienteDetalle = document.getElementById('clientOrdPago');
    if (pagoClienteDetalle) {
      pagoClienteDetalle.innerHTML = renderPagoCliente(orden);
    }
    document.getElementById('clientOrdTelefono').textContent = orden.telefono || 'No registrado';
    // Mostrar dirección del perfil del cliente, no la dirección de pago
    const dirPerfil = orden.direccionPerfil
      ? (orden.direccionPerfil + (orden.ciudad ? ', ' + orden.ciudad : ''))
      : null;
    document.getElementById('clientOrdEnvio').textContent = dirPerfil || orden.direccionEnvio || 'N/A';
    document.getElementById('clientOrdTracking').textContent = orden.numeroSeguimiento || 'Aún no disponible';
    document.getElementById('clientOrdTotal').textContent = 'Bs ' + orden.total.toFixed(2);
    
    const tbody = document.getElementById('clientOrdProducts');
    tbody.innerHTML = (orden.productos || []).map(p => `
      <tr>
        <td>${escapeHtml(p.nombre)}</td>
        <td>${p.cantidad}</td>
        <td>Bs ${p.precio.toFixed(2)}</td>
        <td>Bs ${(p.cantidad * p.precio).toFixed(2)}</td>
      </tr>
    `).join('');

    document.getElementById('clientOrdHistory').innerHTML = (orden.historial || []).map(item => `
      <div class="order-history-item">
        <strong>${escapeHtml(ESTADOS_ORDEN[item.estadoNuevo]?.label || item.estadoNuevo)}</strong>
        <small>${new Date(item.fechaCreacion).toLocaleString()} · ${escapeHtml(item.actorNombre || item.actorRol || 'Sistema')}</small>
        ${item.nota ? `<span>${escapeHtml(item.nota)}</span>` : ''}
      </div>
    `).join('') || '<p class="text-muted small">Sin historial disponible.</p>';

    if (window.bootstrap && window.bootstrap.Modal) {
      const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    } else {
      // Fallback si Bootstrap no cargó a tiempo
      modalEl.classList.add('show');
      modalEl.style.display = 'block';
      document.body.classList.add('modal-open');
      const closeBtn = modalEl.querySelector('.btn-close');
      if (closeBtn) closeBtn.onclick = () => {
        modalEl.classList.remove('show');
        modalEl.style.display = 'none';
        document.body.classList.remove('modal-open');
      };
    }
  } catch (error) {
    console.error(error);
    showNotif('Error al cargar el detalle de la orden', 'error');
  }
};
