(function () {
  const firebaseConfig = {
    apiKey: 'AIzaSyBTp9NbNEl3pwhAmI4-d7IltEnBW33unCo',
    authDomain: 'ecovida-329dc.firebaseapp.com',
    projectId: 'ecovida-329dc',
    storageBucket: 'ecovida-329dc.firebasestorage.app',
    messagingSenderId: '886195457737',
    appId: '1:886195457737:web:5a9f2ee23f5fc74be28718'
  };

  document.addEventListener('DOMContentLoaded', () => {
    const googleBtn = document.getElementById('googleLoginBtn');
    if (!googleBtn) return;

    if (!window.firebase || !window.firebase.auth) {
      showGoogleError('No se pudo cargar Google. Intenta nuevamente.');
      googleBtn.disabled = true;
      return;
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    googleBtn.addEventListener('click', iniciarSesionConGoogle);
  });

  async function iniciarSesionConGoogle() {
    const googleBtn = document.getElementById('googleLoginBtn');
    const textoOriginal = googleBtn.innerHTML;

    try {
      setGoogleLoading(googleBtn, true);

      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const resultadoGoogle = await firebase.auth().signInWithPopup(provider);
      const idToken = await resultadoGoogle.user.getIdToken();
      const resultado = await APIService.loginGoogle(idToken);

      if (resultado.error) {
        showGoogleError(resultado.error);
        return;
      }

      APIService.setToken(resultado.token);
      localStorage.setItem('usuario', JSON.stringify(resultado.usuario));

      window.location.href = resultado.usuario.rol === 'admin'
        ? 'panel-admin.html'
        : 'index.html';
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user') return;
      showGoogleError('No se pudo iniciar sesion con Google.');
    } finally {
      setGoogleLoading(googleBtn, false, textoOriginal);
    }
  }

  function setGoogleLoading(button, loading, htmlOriginal) {
    if (!button) return;
    button.disabled = loading;

    if (loading) {
      button.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Conectando...';
      return;
    }

    button.innerHTML = htmlOriginal || '<img alt="" class="auth-google-icon" src="images/google-g.svg" width="18" height="18"/> Continuar con Google';
  }

  function showGoogleError(message) {
    const errorAlert = document.getElementById('errorAlert');
    if (!errorAlert) return;
    errorAlert.textContent = message;
    errorAlert.style.display = 'block';
  }
})();
