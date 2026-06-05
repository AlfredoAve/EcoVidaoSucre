// Carga dinámica del navbar universal en todas las páginas
fetch('_navbar.html')
  .then(res => res.text())
  .then(html => {
    document.getElementById('navbar-container').innerHTML = html;

    // Si header.js aún no cargó (fetch muy rápido), esperamos DOMContentLoaded
    function initAll() {
      if (typeof navbarBurgerInit === 'function')       navbarBurgerInit();
      if (typeof actualizarNavegacionCuenta === 'function') {
        actualizarNavegacionCuenta();
      } else if (typeof actualizarNavegacion === 'function') {
        actualizarNavegacion();
      }
      if (typeof actualizarCarritoBadge === 'function') actualizarCarritoBadge();
      if (typeof actualizarNotificacionesBadge === 'function') actualizarNotificacionesBadge();
      cargarLucide();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAll, { once: true });
    } else {
      initAll();
    }
  });

function cargarLucide() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
    return;
  }

  if (document.getElementById('lucide-cdn')) return;

  const script = document.createElement('script');
  script.id = 'lucide-cdn';
  script.src = 'https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js';
  script.onload = () => {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  };
  document.body.appendChild(script);
}
