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

    let htmlProductos = '';
    orden.productos.forEach(prod => {
      htmlProductos += `
        <div class="mb-3 pb-3 border-bottom">
          <div class="d-flex justify-content-between">
            <strong>${prod.nombre}</strong>
            <span>Bs ${prod.precio.toFixed(2)}</span>
          </div>
          <small class="text-muted">Cantidad: ${prod.cantidad}</small>
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

const PAYPAL_USD_RATE = 6.96;

function initPayPal(totalAmount) {
  const container = document.getElementById('paypal-button-container');
  if (!container || !window.paypal) {
    console.error('PayPal SDK no disponible todavía');
    return;
  }

  container.innerHTML = '';

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
      document.getElementById('pago-error').style.display = 'block';
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
