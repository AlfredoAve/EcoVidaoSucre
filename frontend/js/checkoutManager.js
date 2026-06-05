// Página de confirmación de orden
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('orderDetails')) {
    mostrarDetallesOrden();
  }
});

async function mostrarDetallesOrden() {
  try {
    let orden = null;
    const params = new URLSearchParams(window.location.search);
    const ordenIdUrl = params.get('id');

    if (ordenIdUrl) {
      // Obtener de la API si venimos de PayPal (tiene ID en la URL)
      orden = await APIService.obtenerOrdenPorId(ordenIdUrl);
      if (orden.error) throw new Error(orden.error);
    } else {
      // Fallback a localStorage (Pago contra entrega clásico)
      const ordenData = localStorage.getItem('ordenActual');
      if (!ordenData) {
        document.getElementById('orderDetails').innerHTML = '<p class="text-danger">No hay orden para mostrar</p>';
        return;
      }
      orden = JSON.parse(ordenData);
    }

    const idMostrar = orden.ordenId || orden.id; // Manejar diferencias entre API y LocalStorage
    const totalMostrar = orden.total || 0;

    document.getElementById('ordenId').textContent = `#${idMostrar}`;
    document.getElementById('ordenTotal').textContent = `Bs ${Number(totalMostrar).toFixed(2)}`;
    document.getElementById('ordenEstado').textContent = orden.estado || 'pendiente';
    document.getElementById('ordenDireccion').textContent = orden.direccionEnvio || 'Sin dirección registrada';

    let htmlProductos = '';
    (orden.productos || []).forEach(prod => {
      const precio = Number(prod.precio || 0);
      htmlProductos += `
        <div class="mb-3 pb-3 border-bottom">
          <div class="d-flex justify-content-between">
            <strong>${escapeHtml(prod.nombre || 'Producto')}</strong>
            <span>Bs ${precio.toFixed(2)}</span>
          </div>
          <small class="text-muted">Cantidad: ${Number(prod.cantidad || 0)}</small>
        </div>
      `;
    });

    document.getElementById('ordenProductos').innerHTML = htmlProductos;
    localStorage.removeItem('ordenActual');
  } catch (error) {
    console.error('Error mostrando orden:', error);
    document.getElementById('orderDetails').innerHTML = '<p class="text-danger">Error al cargar la orden</p>';
  }
}

let paypalInicializado = false;  // Control para evitar doble inicialización

function obtenerCamposPerfilFaltantes(usuario) {
  const campos = [
    ['nombre', 'nombre completo'],
    ['telefono', 'teléfono'],
    ['direccion', 'dirección'],
    ['ciudad', 'ciudad']
  ];

  return campos
    .filter(([clave]) => !String(usuario?.[clave] || '').trim())
    .map(([, etiqueta]) => etiqueta);
}

async function obtenerValidacionPerfilPago() {
  const usuario = await APIService.obtenerPerfil();
  if (!usuario || usuario.error) {
    throw new Error(usuario?.error || 'No se pudo validar tu perfil');
  }

  const camposFaltantes = Array.isArray(usuario.camposPerfilFaltantes)
    ? usuario.camposPerfilFaltantes
    : obtenerCamposPerfilFaltantes(usuario);

  return {
    completo: usuario.perfilCompleto === true || camposFaltantes.length === 0,
    camposFaltantes
  };
}

function mostrarPerfilIncompleto(validacion) {
  const aviso = document.getElementById('perfil-pago-incompleto');
  const mensaje = document.getElementById('perfil-pago-mensaje');
  const faltantes = validacion?.camposFaltantes || [];

  if (mensaje) {
    mensaje.textContent = faltantes.length
      ? `Antes de pagar completa: ${faltantes.join(', ')}.`
      : 'Necesitamos tus datos de contacto y envío antes de crear la orden.';
  }
  if (aviso) aviso.style.display = 'block';
}

function initPayPal(totalAmount) {
  const container = document.getElementById('paypal-button-container');
  if (!container) return;

  // Si ya está inicializado, solo actualizar el total visible y salir
  if (paypalInicializado) {
    const totalPagoEl = document.getElementById('total-pago');
    if (totalPagoEl) totalPagoEl.textContent = `Bs ${Number(totalAmount).toFixed(2)}`;
    return;
  }

  // Si el SDK aún no cargó, esperar hasta 5 segundos
  if (!window.paypal) {
    let intentos = 0;
    const esperar = setInterval(() => {
      intentos++;
      if (window.paypal) {
        clearInterval(esperar);
        initPayPal(totalAmount);
      } else if (intentos >= 50) {
        clearInterval(esperar);
        container.innerHTML = '<p class="text-danger small">No se pudo cargar PayPal. Recarga la página.</p>';
      }
    }, 100);
    return;
  }

  // Limpiar e inicializar una sola vez
  container.innerHTML = '';
  paypalInicializado = true;

  paypal.Buttons({
    style: {
      layout: 'vertical',
      color: 'gold',
      shape: 'rect',
      label: 'paypal',
      height: 45
    },

    createOrder: async function () {
      try {
        const validacionPerfil = await obtenerValidacionPerfilPago();
        if (!validacionPerfil.completo) {
          mostrarPerfilIncompleto(validacionPerfil);
          throw new Error('Completa tu perfil antes de pagar');
        }

        const res = await fetch(`${API_BASE}/paypal/crear-orden`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
          // ELIMINADO: Ya no enviamos el total desde el cliente por seguridad
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error HTTP ' + res.status);
        if (!data.id) throw new Error('No se recibió el ID de la orden de PayPal');
        return data.id;
      } catch (error) {
        console.error('Error al crear orden en Backend:', error);
        throw error; // Lanza el error para que el SDK de PayPal ejecute onError()
      }
    },

    onApprove: async function (data) {
      try {
        const res = await fetch(`${API_BASE}/paypal/capturar-orden`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ paypalOrderId: data.orderID })
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Error HTTP ' + res.status);

        if (result.success) {
          document.getElementById('pago-exitoso').style.display = 'block';
          document.getElementById('paypal-button-container').style.display = 'none';
          setTimeout(() => {
            window.location.href = `orden-confirmacion.html?id=${result.ordenId}`;
          }, 2000);
        } else {
          throw new Error(result.error || 'Error al procesar el pago');
        }
      } catch (err) {
        document.getElementById('pago-error').style.display = 'block';
        document.getElementById('pago-error').textContent = err.message || 'Error al capturar el pago';
        console.error('Error capturando pago:', err);
      }
    },

    onError: function (err) {
      const pagoError = document.getElementById('pago-error');
      if (pagoError) {
        pagoError.style.display = 'block';
        pagoError.textContent = err?.message || 'Error en el pago. Intenta de nuevo.';
      }
      console.error('PayPal error:', err);
    },

    onCancel: function () {
      console.log('Pago cancelado por el usuario');
    }

  }).render('#paypal-button-container');
}

// Pago contra entrega
document.addEventListener('DOMContentLoaded', () => {
  const btnContraentrega = document.getElementById('btn-contraentrega');
  if (!btnContraentrega) return;

  btnContraentrega.addEventListener('click', async () => {
    btnContraentrega.disabled = true;
    btnContraentrega.textContent = 'Procesando...';

    try {
      const modalEl = document.getElementById('addressModal');
      if (modalEl && window.bootstrap?.Modal) {
        const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
        btnContraentrega.disabled = false;
        btnContraentrega.textContent = '📦 Pagar contra entrega';
      } else {
        mostrarModalDireccion?.();
        btnContraentrega.disabled = false;
        btnContraentrega.textContent = '📦 Pagar contra entrega';
      }
    } catch (err) {
      alert('Error al procesar el pedido');
      btnContraentrega.disabled = false;
      btnContraentrega.textContent = '📦 Pagar contra entrega';
    }
  });
});
