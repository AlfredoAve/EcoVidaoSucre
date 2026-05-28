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

  const email = document.getElementById('email').value;
  const contrasena = document.getElementById('contrasena').value;
  const errorAlert = document.getElementById('errorAlert');

  try {
    const resultado = await APIService.login(email, contrasena);

    if (resultado.error) {
      errorAlert.textContent = resultado.error;
      errorAlert.style.display = 'block';
      return;
    }

    // Guardar token
    APIService.setToken(resultado.token);

    // Guardar datos del usuario
    localStorage.setItem('usuario', JSON.stringify(resultado.usuario));

    // Redirigir según el rol
    if (resultado.usuario.rol === 'admin') {
      window.location.href = 'panel-admin.html';
    } else {
      window.location.href = 'index.html';
    }
  } catch (error) {
    errorAlert.textContent = 'Error al iniciar sesión';
    errorAlert.style.display = 'block';
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value;
  const email = document.getElementById('email').value;
  const contrasena = document.getElementById('contrasena').value;
  const confirmar = document.getElementById('confirmar').value;
  const errorAlert = document.getElementById('errorAlert');
  const successAlert = document.getElementById('successAlert');

  if (contrasena.length < 6) {
    errorAlert.textContent = 'La contraseña debe tener al menos 6 caracteres';
    errorAlert.style.display = 'block';
    return;
  }

  if (contrasena !== confirmar) {
    errorAlert.textContent = 'Las contraseñas no coinciden';
    errorAlert.style.display = 'block';
    return;
  }

  try {
    const resultado = await APIService.register(nombre, email, contrasena);

    if (resultado.error) {
      errorAlert.textContent = resultado.error;
      errorAlert.style.display = 'block';
      return;
    }

    successAlert.textContent = 'Cuenta creada exitosamente. Redirigiendo...';
    successAlert.style.display = 'block';

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2000);
  } catch (error) {
    errorAlert.textContent = 'Error al crear la cuenta';
    errorAlert.style.display = 'block';
  }
}

// logout() definido en header.js
