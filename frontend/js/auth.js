// Auth - Manejo de login y registro
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
});

async function handleLogin(e) {
  e.preventDefault();

  const emailInput = document.getElementById('email');
  const email = emailInput.value.trim().toLowerCase();
  const contrasena = document.getElementById('contrasena').value;
  const errorAlert = document.getElementById('errorAlert');

  clearAuthAlert(errorAlert);

  if (!isValidEmail(email)) {
    showAuthAlert(errorAlert, 'Escribe un correo valido. Ejemplo: nombre@gmail.com');
    emailInput.focus();
    return;
  }

  try {
    const resultado = await APIService.login(email, contrasena);

    if (resultado.error) {
      showAuthAlert(errorAlert, resultado.error);
      return;
    }

    APIService.setToken(resultado.token);
    localStorage.setItem('usuario', JSON.stringify(resultado.usuario));

    if (resultado.usuario.rol === 'admin') {
      window.location.href = 'panel-admin.html';
    } else {
      window.location.href = 'index.html';
    }
  } catch (error) {
    showAuthAlert(errorAlert, 'Error al iniciar sesion');
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const emailInput = document.getElementById('email');
  const email = emailInput.value.trim().toLowerCase();
  const contrasena = document.getElementById('contrasena').value;
  const confirmar = document.getElementById('confirmar').value;
  const errorAlert = document.getElementById('errorAlert');
  const successAlert = document.getElementById('successAlert');

  clearAuthAlert(errorAlert);
  clearAuthAlert(successAlert);

  if (!isValidEmail(email)) {
    showAuthAlert(errorAlert, 'Escribe un correo valido. Ejemplo: nombre@gmail.com');
    emailInput.focus();
    return;
  }

  if (contrasena.length < 6) {
    showAuthAlert(errorAlert, 'La contrasena debe tener al menos 6 caracteres');
    return;
  }

  if (contrasena !== confirmar) {
    showAuthAlert(errorAlert, 'Las contrasenas no coinciden');
    return;
  }

  try {
    const resultado = await APIService.register(nombre, email, contrasena);

    if (resultado.error) {
      showAuthAlert(errorAlert, resultado.error);
      return;
    }

    showAuthAlert(successAlert, 'Cuenta creada exitosamente. Redirigiendo...');

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2000);
  } catch (error) {
    showAuthAlert(errorAlert, 'Error al crear la cuenta');
  }
}

function isValidEmail(email) {
  if (!email || email.length > 254) return false;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailPattern.test(email);
}

function showAuthAlert(alertElement, message) {
  if (!alertElement) return;
  alertElement.textContent = message;
  alertElement.style.display = 'block';
}

function clearAuthAlert(alertElement) {
  if (!alertElement) return;
  alertElement.textContent = '';
  alertElement.style.display = 'none';
}

// logout() definido en header.js
