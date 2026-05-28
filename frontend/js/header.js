// Navbar hamburguesa — drawer lateral
let _burgerReady = false;

function navbarBurgerInit() {
  if (_burgerReady) return;          // evita doble registro de handlers

  const burger  = document.querySelector('.ecovida-burger');
  const overlay = document.querySelector('.eco-drawer-overlay');
  const drawer  = document.querySelector('.eco-drawer');
  if (!burger || !overlay || !drawer) return;

  _burgerReady = true;

  // Marcar link activo según página actual
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  drawer.querySelectorAll('a[href]').forEach(link => {
    const linkPage = link.getAttribute('href').split('/').pop().split('?')[0];
    if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
      link.classList.add('active');
    }
  });

  function openMenu() {
    burger.classList.add('active');
    burger.setAttribute('aria-expanded', 'true');
    overlay.classList.add('open');
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    burger.classList.remove('active');
    burger.setAttribute('aria-expanded', 'false');
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  burger.addEventListener('click', (e) => {
    e.stopPropagation();
    burger.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
  });

  overlay.addEventListener('click', closeMenu);

  const closeBtn = drawer.querySelector('.eco-drawer-close');
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);

  // Cerrar al navegar (links de navegación y submenu, no el botón de categorías)
  drawer.addEventListener('click', (e) => {
    if (e.target.closest('a.eco-drawer-link') || e.target.closest('.eco-drawer-submenu a')) {
      closeMenu();
    }
  });
}
// Header - Actualizar navegación según estado de login
document.addEventListener('DOMContentLoaded', () => {
  actualizarNavegacion();
  actualizarCarritoBadge();
});

function logout() {
  APIService.logout();
  localStorage.removeItem('usuario');
  window.location.href = 'index.html';
}

function actualizarNavegacion() {
  if (typeof APIService === 'undefined') return;
  const token = APIService.getToken();
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

  const loginBtn = document.getElementById('loginBtn');
  const userNav = document.getElementById('userNav');
  const userNavMobile = document.getElementById('userNavMobile');
  const userMenu = document.getElementById('userMenu');
  const cartButtons = document.querySelectorAll('.site-header a[href="carrito.html"]');
  const isAdmin = usuario?.rol === 'admin';

  if (token && usuario) {
    let htmlDesktop = '';
    let htmlMobile = '';

    if (isAdmin) {
      htmlDesktop = `
        <a href="panel-admin.html" class="btn btn-outline-warning ecovida-user-btn" aria-label="Panel admin">
          <i data-lucide="settings"></i>
        </a>
        <button onclick="logout()" class="btn btn-outline-danger ecovida-user-btn ms-1" aria-label="Cerrar sesión">
          <i data-lucide="log-out"></i>
        </button>
      `;
      htmlMobile = `
        <a href="panel-admin.html" class="btn btn-warning rounded-pill mb-2">
          <i class="bi bi-gear"></i> Panel Admin
        </a>
        <button onclick="logout()" class="btn btn-outline-danger rounded-pill">
          <i class="bi bi-box-arrow-right"></i> Cerrar Sesión
        </button>
      `;
    } else {
      htmlDesktop = `
        <a href="profile.html" class="btn btn-outline-success ecovida-user-btn" aria-label="Perfil">
          <i data-lucide="user"></i>
        </a>
        <button onclick="logout()" class="btn btn-outline-danger ecovida-user-btn ms-1" aria-label="Cerrar sesión">
          <i data-lucide="log-out"></i>
        </button>
      `;
      htmlMobile = `
        <a href="profile.html" class="btn btn-outline-success rounded-pill mb-2">
          <i class="bi bi-person-circle"></i> ${usuario.nombre}
        </a>
        <button onclick="logout()" class="btn btn-outline-danger rounded-pill">
          <i class="bi bi-box-arrow-right"></i> Cerrar Sesión
        </button>
      `;
    }

    if (userNav) userNav.innerHTML = htmlDesktop;
    if (userNavMobile) userNavMobile.innerHTML = htmlMobile;

    if (loginBtn) loginBtn.style.display = 'none';
    cartButtons.forEach(btn => {
      btn.style.display = isAdmin ? 'none' : '';
    });

    if (userMenu) {
      userMenu.style.display = isAdmin ? 'none' : 'inline-flex';
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) logoutBtn.onclick = logout;
    }
  } else {
    if (userNav) {
      userNav.innerHTML = '<a href="login.html" class="btn btn-outline-success ecovida-user-btn" aria-label="Iniciar sesión"><i data-lucide="user"></i></a>';
    }
    if (userNavMobile) {
      userNavMobile.innerHTML = '<a href="login.html" class="btn btn-success rounded-pill">Iniciar Sesión</a>';
    }
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (userMenu) userMenu.style.display = 'none';
    cartButtons.forEach(btn => { btn.style.display = ''; });
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

async function actualizarCarritoBadge() {
  if (typeof APIService === 'undefined') return;
  const token = APIService.getToken();
  if (!token) return;

  try {
    const carrito = await APIService.obtenerCarrito();
    const badge = document.getElementById('cartCount');
    if (badge) {
      badge.textContent = carrito.cantidad || 0;
    }
  } catch (error) {
    console.log('Error al obtener carrito');
  }
}

// Actualizar badge cuando se agrega al carrito
function actualizarBadgeCarrito() {
  if (APIService.getToken()) {
    actualizarCarritoBadge();
  }
}
