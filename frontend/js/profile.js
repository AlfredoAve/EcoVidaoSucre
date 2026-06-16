
// EcoVida - Panel de cliente premium
(function () {
  const TABS_VALIDOS = ['perfil', 'ordenes', 'notificaciones', 'resenas', 'favoritos'];
  const ESTADOS_ORDEN = {
    pendiente: { label: 'Pendiente' },
    confirmada: { label: 'Confirmada' },
    enviado: { label: 'Enviada' },
    entrega_reportada: { label: 'Por confirmar' },
    entregado: { label: 'Recibida' },
    completada: { label: 'Completada' },
    cancelada: { label: 'Cancelada' }
  };

  document.addEventListener('DOMContentLoaded', async () => {
    const token = APIService?.getToken?.();
    const usuarioLocal = parseJSON(localStorage.getItem('usuario'));

    if (!token) {
      window.location.href = 'login.html';
      return;
    }

    if (usuarioLocal?.rol === 'admin') {
      window.location.href = 'panel-admin.html';
      return;
    }

    configurarEventos();
    await cargarDatosPerfil();
    await cargarConteoNotificaciones();

    const tabInicial = new URLSearchParams(window.location.search).get('tab');
    cambiarTab(TABS_VALIDOS.includes(tabInicial) ? tabInicial : 'perfil');
  });

  function parseJSON(value) {
    try { return JSON.parse(value || 'null'); } catch (_) { return null; }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function notify(message, type = 'info') {
    if (typeof window.showNotif === 'function') {
      window.showNotif(message, type);
    } else {
      console[type === 'error' ? 'error' : 'log'](message);
    }
  }

  function confirmDialog(message, onConfirm) {
    if (typeof window.showConfirm === 'function') {
      window.showConfirm(message, onConfirm);
      return;
    }
    if (window.confirm(message)) onConfirm();
  }

  function parseStoredDate(value) {
    if (!value) return new Date(NaN);
    if (value instanceof Date) return value;
    if (typeof value !== 'string') return new Date(value);
    const trimmed = value.trim();
    if (!trimmed) return new Date(NaN);
    if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed)) return new Date(trimmed);
    if (trimmed.includes('T')) return new Date(`${trimmed}Z`);
    return new Date(`${trimmed.replace(' ', 'T')}Z`);
  }

  function formatBoliviaDate(value, withTime = false) {
    const date = parseStoredDate(value);
    if (Number.isNaN(date.getTime())) return '-';
    const options = withTime
      ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
      : { year: 'numeric', month: '2-digit', day: '2-digit' };
    return date.toLocaleString('es-BO', { ...options, timeZone: 'America/La_Paz' });
  }

  function configurarEventos() {
    document.querySelectorAll('.tab-link').forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        cambiarTab(link.dataset.tab);
      });
    });

    document.getElementById('profileForm')?.addEventListener('submit', guardarPerfil);
    document.getElementById('markAllNotificationsBtn')?.addEventListener('click', marcarTodasNotificacionesLeidas);
    document.getElementById('clearNotificationsBtn')?.addEventListener('click', limpiarNotificaciones);
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      if (typeof window.logout === 'function') window.logout();
    });
  }

  function cambiarTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.style.display = 'none';
    });
    document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));

    const tab = document.getElementById(`${tabName}-tab`);
    if (tab) tab.style.display = 'block';
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

    if (tabName === 'ordenes') cargarOrdenes();
    if (tabName === 'notificaciones') cargarNotificaciones();
    if (tabName === 'resenas') cargarResenas();
    if (tabName === 'favoritos') cargarFavoritos();
  }

  async function cargarDatosPerfil() {
    try {
      const usuario = await APIService.obtenerPerfil();
      document.getElementById('userName').textContent = usuario.nombre || 'Usuario';
      document.getElementById('userEmail').textContent = usuario.email || 'email@example.com';
      document.getElementById('nombre').value = usuario.nombre || '';
      document.getElementById('email').value = usuario.email || '';
      document.getElementById('telefono').value = usuario.telefono || '';
      document.getElementById('ciudad').value = usuario.ciudad || '';
      document.getElementById('direccion').value = usuario.direccion || '';
    } catch (error) {
      console.error('Error cargando perfil:', error);
      notify('Error al cargar el perfil', 'error');
    }
  }

  async function guardarPerfil(event) {
    event.preventDefault();

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

    const successMsg = document.getElementById('successMsg');
    const errorMsg = document.getElementById('errorMsg');
    successMsg.style.display = 'none';
    errorMsg.style.display = 'none';

    if (faltantes.length) {
      errorMsg.textContent = `Completa los campos obligatorios: ${faltantes.join(', ')}.`;
      errorMsg.style.display = 'block';
      return;
    }

    try {
      const resultado = await APIService.actualizarPerfil(datos);
      if (resultado?.error) {
        errorMsg.textContent = resultado.error;
        errorMsg.style.display = 'block';
        return;
      }

      successMsg.textContent = 'Perfil actualizado correctamente';
      successMsg.style.display = 'block';
      document.getElementById('userName').textContent = datos.nombre;

      const usuarioLocal = parseJSON(localStorage.getItem('usuario'));
      if (usuarioLocal) {
        usuarioLocal.nombre = datos.nombre;
        localStorage.setItem('usuario', JSON.stringify(usuarioLocal));
      }

      setTimeout(() => {
        successMsg.style.display = 'none';
      }, 3000);
    } catch (error) {
      errorMsg.textContent = 'Error al guardar el perfil';
      errorMsg.style.display = 'block';
    }
  }

  function getEstadoClienteClass(estado = '') {
    const normalizado = String(estado || '').toLowerCase();
    if (normalizado === 'pendiente') return 'is-pending';
    if (normalizado === 'confirmada') return 'is-confirmed';
    if (normalizado === 'enviado' || normalizado === 'entrega_reportada') return 'is-shipped';
    if (normalizado === 'entregado' || normalizado === 'completada') return 'is-done';
    if (normalizado === 'cancelada') return 'is-cancelled';
    return 'is-neutral';
  }

  function renderPagoCliente(orden) {
    const estadoPago = orden.estadoPago === 'pagado' ? 'pagado' : 'pendiente';
    const metodo = orden.metodoPago === 'paypal' ? 'PayPal' : 'Contra entrega';
    const label = estadoPago === 'pagado' ? 'Pagado' : 'Pago pendiente';
    return `
      <span class="client-payment-chip ${estadoPago === 'pagado' ? 'is-paid' : 'is-pending'}">
        <i class="bi ${estadoPago === 'pagado' ? 'bi-check2-circle' : 'bi-clock'}"></i>
        ${label}
      </span>
      <span class="client-payment-method">${metodo}</span>
    `;
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
      return '<div class="order-timeline-cancelled"><i class="bi bi-x-circle"></i> Pedido cancelado</div>';
    }

    return `
      <div class="order-timeline">
        ${pasos.map(([clave, etiqueta]) => {
          const activo = posicion >= ordenEstados.indexOf(clave);
          return `
            <div class="order-timeline-step ${activo ? 'is-complete' : ''}">
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

    const kpis = [
      { label: 'Total pedidos', value: total, desc: 'Pedidos realizados', icon: 'bi-receipt' },
      { label: 'En proceso', value: activas, desc: 'Pedidos en curso', icon: 'bi-hourglass-split' },
      { label: 'Por confirmar', value: porConfirmar, desc: 'Esperando recepción', icon: 'bi-box-seam' },
      { label: 'Recibidos', value: recibidas, desc: 'Pedidos entregados', icon: 'bi-check2-circle' }
    ];

    summary.innerHTML = `
      <div class="client-order-kpis">
        ${kpis.map((item, index) => `
          <div class="client-order-kpi ${index === 2 && item.value ? 'is-attention' : ''}">
            <div class="client-order-kpi-icon"><i class="bi ${item.icon}"></i></div>
            <div class="client-order-kpi-copy">
              <span>${item.label}</span>
              <strong>${item.value}</strong>
              <small>${item.desc}</small>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function getImageUrl(item) {
    const raw = item?.imagen || item?.image || item?.imagenProducto || item?.productoImagen || '';
    if (!raw) return 'https://placehold.co/96x96/F4F6F4/5F6E65?text=EcoVida';
    if (typeof APIService?.getImageUrl === 'function') return APIService.getImageUrl(raw);
    return raw;
  }

  function renderOrderProductPreview(productos = []) {
    const principal = productos[0] || null;
    if (!principal) {
      return `
        <div class="order-product-thumb is-placeholder">
          <i class="bi bi-bag"></i>
        </div>
      `;
    }

    return `
      <div class="order-product-thumb">
        <img src="${getImageUrl(principal)}" alt="${escapeHtml(principal.nombre || 'Producto')}" onerror="this.src='https://placehold.co/96x96/F4F6F4/5F6E65?text=EcoVida';this.onerror=null;">
      </div>
    `;
  }

  async function cargarOrdenes() {
    const container = document.getElementById('ordenesList');
    if (!container) return;
    container.innerHTML = '<div class="profile-loading"><span class="spinner-border spinner-border-sm" role="status"></span> Cargando tus pedidos...</div>';

    try {
      const ordenes = await APIService.obtenerMisOrdenes();

      if (!ordenes || !ordenes.length) {
        renderResumenOrdenesCliente([]);
        container.innerHTML = `
          <div class="profile-empty-state">
            <i class="bi bi-bag-heart"></i>
            <strong>Todavía no tienes pedidos</strong>
            <span>Cuando compres productos EcoVida, tus pedidos aparecerán aquí.</span>
            <a href="productos.html">Explorar productos</a>
          </div>
        `;
        return;
      }

      renderResumenOrdenesCliente(ordenes);

      container.innerHTML = ordenes.map(orden => {
        const estado = ESTADOS_ORDEN[orden.estado] || { label: orden.estado || 'Pendiente' };
        const estadoClass = getEstadoClienteClass(orden.estado);
        const productosOrden = Array.isArray(orden.productos) ? orden.productos : [];
        const resumenProductos = productosOrden
          .slice(0, 2)
          .map(p => `${escapeHtml(p.nombre)} x${Number(p.cantidad || 0)}`)
          .join(' · ');
        const extrasProductos = productosOrden.length > 2 ? ` +${productosOrden.length - 2} más` : '';
        const seguimiento = orden.numeroSeguimiento
          ? `<div class="order-client-meta"><i class="bi bi-truck"></i><span>Seguimiento: ${escapeHtml(orden.numeroSeguimiento)}</span></div>`
          : '';
        const textoConfirmar = orden.metodoPago === 'contraentrega'
          ? 'Confirmar recepción y pago'
          : 'Confirmar recepción';
        const confirmarRecepcion = orden.estado === 'enviado'
          ? `<button class="client-order-action is-primary" onclick="window.confirmarRecepcionOrden(${orden.id})"><i class="bi bi-box2-heart"></i> ${textoConfirmar}</button>`
          : '';
        const mensajeProblema = encodeURIComponent(`Hola EcoVida, necesito ayuda con mi pedido ${orden.id}.`);

        return `
          <article class="order-client-card">
            <div class="order-client-head">
              <div class="order-client-title">
                <span class="order-client-eyebrow">Pedido #${orden.id}</span>
                <p class="order-client-date mb-0">${formatBoliviaDate(orden.fechaCreacion)}</p>
              </div>
              <span class="client-status-chip ${estadoClass}">${escapeHtml(estado.label)}</span>
            </div>

            <div class="order-client-body">
              ${renderOrderProductPreview(productosOrden)}
              <div class="order-client-info">
                <p class="order-client-products">${resumenProductos || 'Productos del pedido'}${extrasProductos}</p>
                <div class="order-client-meta">${renderPagoCliente(orden)}</div>
                <div class="order-client-meta"><i class="bi bi-geo-alt"></i><span>${escapeHtml(orden.direccionEnvio || 'Dirección no registrada')}</span></div>
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
              <button class="client-order-action" onclick="window.verDetalleOrdenCliente(${orden.id})"><i class="bi bi-eye"></i> Ver detalle</button>
              <button class="client-order-action is-gold" onclick="window.descargarFacturaCliente(${orden.id})"><i class="bi bi-file-earmark-arrow-down"></i> Descargar factura</button>
              <a class="client-order-action is-danger" href="https://wa.me/59175442968?text=${mensajeProblema}" target="_blank" rel="noopener noreferrer"><i class="bi bi-life-preserver"></i> Ayuda</a>
            </div>
          </article>
        `;
      }).join('');
    } catch (error) {
      console.error('Error cargando órdenes:', error);
      container.innerHTML = '<div class="profile-empty-state is-error"><i class="bi bi-exclamation-triangle"></i><strong>No se pudieron cargar tus pedidos</strong></div>';
    }
  }

  window.confirmarRecepcionOrden = function (ordenId) {
    confirmDialog('¿Confirmas que recibiste tu pedido? Si fue contra entrega, también confirmas que pagaste en efectivo.', async () => {
      try {
        const resultado = await APIService.confirmarRecepcionOrden(ordenId);
        if (resultado?.error) {
          notify(resultado.error, 'error');
          return;
        }
        notify(resultado?.mensaje || 'Recepción confirmada', 'success');
        await cargarOrdenes();
        await cargarConteoNotificaciones();
      } catch (error) {
        notify('No se pudo confirmar la recepción', 'error');
      }
    });
  };

  async function cargarConteoNotificaciones() {
    try {
      const data = await APIService.obtenerNotificacionesNoLeidas();
      const badge = document.getElementById('profileNotificationCount');
      if (!badge) return;
      const total = Number(data?.total) || 0;
      badge.textContent = total;
      badge.style.display = total > 0 ? 'inline-flex' : 'none';
    } catch (error) {
      console.error('Error cargando conteo de notificaciones:', error);
    }
  }

  function formatNotificationMessage(mensaje = '') {
    return String(mensaje || '')
      .replace(/Orden\s+#(\d+)/gi, 'Pedido $1')
      .replace(/Tu orden/gi, 'Tu pedido')
      .replace(/tu orden/gi, 'tu pedido')
      .replace(/fue completada/gi, 'fue completado');
  }

  function getNotificationIcon(tipo = '') {
    const normalizado = String(tipo || '').toLowerCase();
    if (normalizado.includes('pago')) return 'bi-credit-card';
    if (normalizado.includes('env')) return 'bi-truck';
    if (normalizado.includes('complet') || normalizado.includes('recep')) return 'bi-check2-circle';
    return 'bi-bell';
  }

  async function cargarNotificaciones() {
    const container = document.getElementById('notificacionesList');
    if (!container) return;
    container.innerHTML = '<div class="profile-loading"><span class="spinner-border spinner-border-sm" role="status"></span> Cargando notificaciones...</div>';

    try {
      const data = await APIService.obtenerNotificaciones();
      const notificaciones = data?.notificaciones || [];
      if (!notificaciones.length) {
        container.innerHTML = `
          <div class="profile-empty-state">
            <i class="bi bi-bell"></i>
            <strong>No tienes notificaciones</strong>
            <span>Cuando haya novedades de tus pedidos, aparecerán aquí.</span>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="notification-list">
          ${notificaciones.map(notificacion => {
            const enlace = JSON.stringify(notificacion.enlace || '').replace(/"/g, '&quot;');
            return `
              <article class="notification-card ${notificacion.leida ? '' : 'is-unread'}">
                <button class="notification-main" type="button" onclick="window.abrirNotificacion(${notificacion.id}, ${enlace})">
                  <span class="notification-icon"><i class="bi ${getNotificationIcon(notificacion.tipo)}"></i></span>
                  <span class="notification-content">
                    <strong>${escapeHtml(formatNotificationMessage(notificacion.mensaje))}</strong>
                    <small>${formatBoliviaDate(notificacion.fechaCreacion, true)}</small>
                  </span>
                </button>
                <button class="notification-delete" type="button" title="Eliminar notificación" onclick="window.eliminarNotificacionCliente(${notificacion.id})">
                  <i class="bi bi-x-lg"></i>
                </button>
              </article>
            `;
          }).join('')}
        </div>
      `;
    } catch (error) {
      container.innerHTML = '<div class="profile-empty-state is-error"><i class="bi bi-exclamation-triangle"></i><strong>No se pudieron cargar las notificaciones</strong></div>';
    }
  }

  window.abrirNotificacion = async function (id, enlace) {
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

  async function limpiarNotificaciones() {
    confirmDialog('¿Quieres borrar todas tus notificaciones?', async () => {
      const resultado = await APIService.limpiarNotificaciones();
      if (resultado?.error) {
        notify(resultado.error, 'error');
        return;
      }
      notify('Notificaciones eliminadas', 'success');
      await cargarConteoNotificaciones();
      await cargarNotificaciones();
    });
  }

  window.eliminarNotificacionCliente = async function (id) {
    const resultado = await APIService.eliminarNotificacion(id);
    if (resultado?.error) {
      notify(resultado.error, 'error');
      return;
    }
    await cargarConteoNotificaciones();
    await cargarNotificaciones();
  };

  async function cargarResenas() {
    const container = document.getElementById('resenasList');
    if (!container) return;
    container.innerHTML = '<div class="profile-loading"><span class="spinner-border spinner-border-sm" role="status"></span> Cargando reseñas...</div>';

    try {
      const resenas = await APIService.obtenerMisResenas();
      if (!resenas || !resenas.length) {
        container.innerHTML = '<div class="profile-empty-state"><i class="bi bi-star"></i><strong>Aún no escribiste reseñas</strong><span>Cuando califiques un producto, aparecerá aquí.</span></div>';
        return;
      }

      container.innerHTML = resenas.map(resena => `
        <article class="review-card-client">
          <div class="review-card-head">
            <strong>${escapeHtml(resena.nombre)}</strong>
            <span class="review-stars-client">${'★'.repeat(Number(resena.calificacion || 0))}${'☆'.repeat(Math.max(0, 5 - Number(resena.calificacion || 0)))}</span>
          </div>
          <p>${escapeHtml(resena.comentario)}</p>
          <small>${formatBoliviaDate(resena.fechaCreacion)}</small>
        </article>
      `).join('');
    } catch (error) {
      console.error('Error cargando reseñas:', error);
      container.innerHTML = '<div class="profile-empty-state is-error"><i class="bi bi-exclamation-triangle"></i><strong>No se pudieron cargar las reseñas</strong></div>';
    }
  }

  async function cargarFavoritos() {
    const container = document.getElementById('favoritosList');
    const emptyState = document.getElementById('favoritosEmpty');
    if (!container || !emptyState) return;

    container.innerHTML = '<div class="profile-loading"><span class="spinner-border spinner-border-sm" role="status"></span> Cargando favoritos...</div>';
    emptyState.style.display = 'none';

    try {
      const favoritos = await APIService.obtenerFavoritos();
      if (!favoritos || !favoritos.length) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
      }

      container.innerHTML = `
        <div class="row g-3">
          ${favoritos.map(prod => `
            <div class="col-sm-6 col-lg-4">
              <div class="card h-100 border-0 eco-card">
                <div class="eco-card-img-wrapper">
                  <img src="${getImageUrl(prod)}" class="card-img-top eco-card-img" alt="${escapeHtml(prod.nombre)}" onerror="this.src='https://placehold.co/400x400/e9ecef/6c757d?text=Sin+Imagen';this.onerror=null;">
                  <span class="eco-stock-badge eco-stock-ok">Favorito</span>
                </div>
                <div class="card-body d-flex flex-column eco-card-body">
                  <span class="eco-cat-label">${escapeHtml(prod.categoriaNombre || 'Natural')}</span>
                  <h6 class="card-title fw-bold mb-1 eco-card-title">${escapeHtml(prod.nombre)}</h6>
                  <div class="d-flex align-items-center justify-content-between mt-1 mb-3"><span class="prod-precio fw-bold eco-precio">Bs ${Number(prod.precio || 0).toFixed(2)}</span></div>
                  <div class="d-flex gap-2 mt-auto eco-btn-row">
                    <a href="productos.html" class="btn btn-outline-secondary btn-sm flex-grow-1 eco-btn-ver">Ver más</a>
                    <button class="btn btn-outline-secondary btn-sm flex-grow-1" data-remove-favorito="${prod.id}">Quitar</button>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      container.addEventListener('click', async event => {
        const btn = event.target.closest('[data-remove-favorito]');
        if (!btn) return;
        event.preventDefault();
        const productoId = Number(btn.dataset.removeFavorito);
        const resultado = await APIService.eliminarFavorito(productoId);
        if (resultado?.error) {
          notify(resultado.error, 'error');
          return;
        }
        cargarFavoritos();
      }, { once: true });
    } catch (error) {
      console.error('Error cargando favoritos:', error);
      container.innerHTML = '<p class="text-danger">Error al cargar favoritos</p>';
    }
  }

  window.descargarFacturaCliente = async function (ordenId) {
    try {
      notify('Generando factura...', 'info');
      await APIService.descargarFactura(ordenId);
    } catch (error) {
      console.error(error);
      notify(error?.message || 'Error al descargar la factura', 'error');
    }
  };

  window.verDetalleOrdenCliente = async function (ordenId) {
    try {
      const orden = await APIService.obtenerOrdenPorId(ordenId);
      if (orden?.error) throw new Error(orden.error);

      document.getElementById('clientOrderDetailModal')?.remove();

      const estado = ESTADOS_ORDEN[orden.estado] || { label: orden.estado || 'Pendiente' };
      const estadoClass = getEstadoClienteClass(orden.estado);
      const dirPerfil = orden.direccionPerfil ? `${orden.direccionPerfil}${orden.ciudad ? ', ' + orden.ciudad : ''}` : null;
      const productos = (orden.productos || []).map(p => `
        <div class="client-detail-product">
          <div>
            <strong>${escapeHtml(p.nombre)}</strong>
            <span>${Number(p.cantidad || 0)} unidad${Number(p.cantidad || 0) === 1 ? '' : 'es'} x Bs ${Number(p.precio || 0).toFixed(2)}</span>
          </div>
          <b>Bs ${(Number(p.cantidad || 0) * Number(p.precio || 0)).toFixed(2)}</b>
        </div>
      `).join('');
      const historial = (orden.historial || []).map(item => `
        <div class="order-history-item">
          <strong>${escapeHtml(ESTADOS_ORDEN[item.estadoNuevo]?.label || item.estadoNuevo)}</strong>
          <small>${formatBoliviaDate(item.fechaCreacion, true)} &middot; ${escapeHtml(item.actorNombre || item.actorRol || 'Sistema')}</small>
          ${item.nota ? `<span>${escapeHtml(item.nota)}</span>` : ''}
        </div>
      `).join('') || '<p class="text-muted small mb-0">Sin historial disponible.</p>';

      const html = `
        <div class="modal fade client-order-modal" id="clientOrderDetailModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <div>
                  <span class="order-client-eyebrow">Detalle del pedido</span>
                  <h5 class="modal-title">Pedido #${orden.id}</h5>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <div class="client-detail-hero">
                  <span class="client-status-chip ${estadoClass}">${escapeHtml(estado.label)}</span>
                  <strong>Bs ${Number(orden.total || 0).toFixed(2)}</strong>
                </div>
                <div class="client-detail-grid">
                  <div class="client-detail-box"><span>Pago</span><div>${renderPagoCliente(orden)}</div></div>
                  <div class="client-detail-box"><span>Teléfono</span><strong>${escapeHtml(orden.telefono || 'No registrado')}</strong></div>
                  <div class="client-detail-box is-wide"><span>Entrega</span><strong>${escapeHtml(dirPerfil || orden.direccionEnvio || 'Dirección no registrada')}</strong></div>
                  <div class="client-detail-box"><span>Seguimiento</span><strong>${escapeHtml(orden.numeroSeguimiento || 'Aún no disponible')}</strong></div>
                </div>
                <div class="client-detail-section"><h6>Productos</h6><div class="client-detail-products">${productos || '<p class="text-muted small mb-0">Sin productos registrados.</p>'}</div></div>
                <div class="client-detail-section"><h6>Historial</h6>${historial}</div>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', html);
      const modalEl = document.getElementById('clientOrderDetailModal');
      if (window.bootstrap?.Modal) {
        window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
      } else {
        modalEl.classList.add('show');
        modalEl.style.display = 'block';
        document.body.classList.add('modal-open');
        modalEl.querySelector('.btn-close')?.addEventListener('click', () => {
          modalEl.classList.remove('show');
          modalEl.style.display = 'none';
          document.body.classList.remove('modal-open');
        }, { once: true });
      }
    } catch (error) {
      console.error(error);
      notify('Error al cargar el detalle del pedido', 'error');
    }
  };
})();
