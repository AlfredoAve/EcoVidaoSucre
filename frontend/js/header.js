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
    if (e.target.closest('a.eco-drawer-link') || e.target.closest('.eco-drawer-submenu a') || e.target.closest('a.eco-drawer-account-link')) {
      closeMenu();
    }
  });
}
// Header - Actualizar navegación según estado de login
document.addEventListener('DOMContentLoaded', () => {
  actualizarNavegacionCuenta();
  actualizarCarritoBadge();
  actualizarNotificacionesBadge();
});

function logout() {
  APIService.logout();
  localStorage.removeItem('usuario');
  window.location.href = 'index.html';
}

function escapeHeaderText(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function getPanelInfo(usuario) {
  const isAdmin = usuario?.rol === 'admin';
  return {
    isAdmin,
    panelHref: isAdmin ? 'panel-admin.html' : 'profile.html',
    panelLabel: isAdmin ? 'Panel admin' : 'Panel cliente',
    roleLabel: isAdmin ? 'Administrador' : 'Cliente'
  };
}

function setupAccountDropdown() {
  const menu = document.getElementById('accountMenu');
  const toggle = document.getElementById('accountMenuToggle');
  if (!menu || !toggle) return;

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  menu.addEventListener('click', (event) => event.stopPropagation());

  if (!window.ecoAccountDropdownReady) {
    window.ecoAccountDropdownReady = true;
    document.addEventListener('click', () => {
      document.querySelectorAll('.eco-account-menu.open').forEach(openMenu => {
        openMenu.classList.remove('open');
        openMenu.querySelector('[aria-expanded="true"]')?.setAttribute('aria-expanded', 'false');
      });
    });
  }
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
        <a href="panel-admin.html" class="btn btn-outline-success ecovida-user-btn eco-admin-main-btn" aria-label="Panel admin">
          <i data-lucide="shield-check"></i><span>Admin</span>
        </a>
        <button onclick="logout()" class="btn btn-outline-danger ecovida-user-btn ms-1" aria-label="Cerrar sesión">
          <i data-lucide="log-out"></i>
        </button>
      `;
      htmlMobile = `
        <a href="panel-admin.html" class="btn btn-outline-success rounded-pill mb-2">
          <i class="bi bi-shield-check"></i> Panel Admin
        </a>
        <button onclick="logout()" class="btn btn-outline-danger rounded-pill">
          <i class="bi bi-box-arrow-right"></i> Cerrar Sesión
        </button>
      `;
    } else {
      htmlDesktop = `
        <a href="profile.html?tab=notificaciones" class="btn btn-outline-success ecovida-user-btn position-relative" aria-label="Perfil y notificaciones">
          <i data-lucide="user"></i>
          <span id="notificationCount" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="display:none;">0</span>
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

function actualizarNavegacionCuenta() {
  if (typeof APIService === 'undefined') return;
  const token = APIService.getToken();
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

  const loginBtn = document.getElementById('loginBtn');
  const userNav = document.getElementById('userNav');
  const userNavMobile = document.getElementById('userNavMobile');
  const userMenu = document.getElementById('userMenu');
  const cartButtons = document.querySelectorAll('.site-header a[href="carrito.html"]');

  if (token && usuario) {
    const panelInfo = getPanelInfo(usuario);
    const nombreUsuario = escapeHeaderText(usuario.nombre || usuario.email || 'Mi cuenta');
    const emailUsuario = escapeHeaderText(usuario.email || '');
    const roleLabel = escapeHeaderText(panelInfo.roleLabel);

    const htmlDesktop = `
      <div class="eco-account-menu" id="accountMenu">
        <button class="eco-account-trigger" id="accountMenuToggle" type="button" aria-label="Abrir menu de cuenta" aria-expanded="false">
          <i data-lucide="${panelInfo.isAdmin ? 'shield-check' : 'user'}"></i>
          <span class="eco-account-trigger-text">Mi cuenta</span>
          <span id="notificationCount" class="eco-account-badge" style="display:none;">0</span>
        </button>
        <div class="eco-account-dropdown" role="menu" aria-label="Menu de cuenta">
          <div class="eco-account-summary">
            <span class="eco-account-name">${nombreUsuario}</span>
            <span class="eco-account-role">${roleLabel}</span>
            ${emailUsuario ? `<span class="eco-account-email">${emailUsuario}</span>` : ''}
          </div>
          <a href="${panelInfo.panelHref}" class="eco-account-item" role="menuitem">
            <i data-lucide="${panelInfo.isAdmin ? 'layout-dashboard' : 'user-round'}"></i>
            <span>${panelInfo.panelLabel}</span>
          </a>
          ${panelInfo.isAdmin ? '' : `
            <a href="profile.html?tab=notificaciones" class="eco-account-item" role="menuitem">
              <i data-lucide="bell"></i>
              <span>Notificaciones</span>
            </a>
          `}
          <button onclick="logout()" class="eco-account-item eco-account-logout" type="button" role="menuitem">
            <i data-lucide="log-out"></i>
            <span>Cerrar sesion</span>
          </button>
        </div>
      </div>
    `;

    const htmlMobile = `
      <div class="eco-drawer-account">
        <div class="eco-drawer-account-summary">
          <span class="eco-drawer-account-label">${roleLabel}</span>
          <strong>${nombreUsuario}</strong>
          ${emailUsuario ? `<small>${emailUsuario}</small>` : ''}
        </div>
        <a href="${panelInfo.panelHref}" class="eco-drawer-account-link">
          <i class="bi ${panelInfo.isAdmin ? 'bi-speedometer2' : 'bi-person-circle'}"></i>
          ${panelInfo.panelLabel}
        </a>
        <button onclick="logout()" class="eco-drawer-account-link eco-drawer-account-logout" type="button">
          <i class="bi bi-box-arrow-right"></i>
          Cerrar sesion
        </button>
      </div>
    `;

    if (userNav) userNav.innerHTML = htmlDesktop;
    if (userNavMobile) userNavMobile.innerHTML = htmlMobile;
    if (loginBtn) loginBtn.style.display = 'none';
    cartButtons.forEach(btn => {
      btn.style.display = panelInfo.isAdmin ? 'none' : '';
    });

    if (userMenu) {
      userMenu.style.display = panelInfo.isAdmin ? 'none' : 'inline-flex';
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) logoutBtn.onclick = logout;
    }
    setupAccountDropdown();
  } else {
    if (userNav) {
      userNav.innerHTML = '<a href="login.html" class="btn btn-outline-success ecovida-user-btn" aria-label="Iniciar sesion"><i data-lucide="user"></i></a>';
    }
    if (userNavMobile) {
      userNavMobile.innerHTML = '<a href="login.html" class="btn btn-success rounded-pill">Iniciar sesion</a>';
    }
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (userMenu) userMenu.style.display = 'none';
    cartButtons.forEach(btn => { btn.style.display = ''; });
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

actualizarNavegacion = actualizarNavegacionCuenta;

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

async function actualizarNotificacionesBadge() {
  if (typeof APIService === 'undefined' || !APIService.getToken()) return;
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
  if (!usuario || usuario.rol === 'admin') return;

  try {
    const data = await APIService.obtenerNotificacionesNoLeidas();
    const badge = document.getElementById('notificationCount');
    if (!badge) return;
    const total = Number(data.total) || 0;
    badge.textContent = total > 99 ? '99+' : total;
    badge.style.display = total > 0 ? 'inline-block' : 'none';
  } catch (error) {
    console.log('Error al obtener notificaciones');
  }
}

// Actualizar badge cuando se agrega al carrito
function actualizarBadgeCarrito() {
  if (APIService.getToken()) {
    actualizarCarritoBadge();
  }
}
