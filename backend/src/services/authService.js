const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/userRepository');
const Usuario = require('../models/Usuario');

if (!process.env.JWT_SECRET) {
  console.warn('ADVERTENCIA: JWT_SECRET no esta definido en variables de entorno. Usando valor por defecto inseguro.');
}

const JWT_SECRET = process.env.JWT_SECRET || 'ecovida-secret-key-2025';
const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyBTp9NbNEl3pwhAmI4-d7IltEnBW33unCo';

class AuthService {
  static async registrarUsuario(nombre, email, contrasena, rol = 'cliente') {
    const emailNormalizado = email.trim().toLowerCase();
    const usuarioExistente = await UserRepository.obtenerPorEmail(emailNormalizado);

    if (usuarioExistente) {
      throw new Error('El email ya esta registrado');
    }

    const contrasenaHash = await bcryptjs.hash(contrasena, 10);
    const nuevoUsuario = new Usuario(nombre, emailNormalizado, contrasenaHash, rol);
    const usuarioId = await UserRepository.crearUsuario(nuevoUsuario);

    return { id: usuarioId, nombre, email: emailNormalizado, rol };
  }

  static async loginUsuario(email, contrasena) {
    const usuario = await UserRepository.obtenerPorEmail(email.trim().toLowerCase());

    if (!usuario) {
      throw new Error('Email o contrasena incorrectos');
    }

    if (!usuario.activo) {
      throw new Error('Usuario desactivado');
    }

    const contrasenaValida = await bcryptjs.compare(contrasena, usuario.contrasena);
    if (!contrasenaValida) {
      throw new Error('Email o contrasena incorrectos');
    }

    return this.crearSesion(usuario);
  }

  static async loginConFirebase(idToken) {
    const firebaseUser = await this.verificarFirebaseIdToken(idToken);
    const email = firebaseUser.email.trim().toLowerCase();

    let usuario = await UserRepository.obtenerPorEmail(email);

    if (usuario && !usuario.activo) {
      throw new Error('Usuario desactivado');
    }

    if (!usuario) {
      const nombre = firebaseUser.displayName || email.split('@')[0] || 'Cliente EcoVida';
      const contrasenaHash = await bcryptjs.hash(`firebase:${firebaseUser.localId}:${Date.now()}`, 10);
      const nuevoUsuario = new Usuario(nombre, email, contrasenaHash, 'cliente');
      const usuarioId = await UserRepository.crearUsuario(nuevoUsuario);
      usuario = await UserRepository.obtenerPorId(usuarioId);
    }

    return this.crearSesion(usuario);
  }

  static async verificarFirebaseIdToken(idToken) {
    if (!idToken) {
      throw new Error('Token de Google requerido');
    }

    const respuesta = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    const data = await respuesta.json();
    const firebaseUser = data.users?.[0];

    if (!respuesta.ok || !firebaseUser?.email) {
      throw new Error('No se pudo validar la cuenta de Google');
    }

    const esGoogle = Array.isArray(firebaseUser.providerUserInfo)
      && firebaseUser.providerUserInfo.some((provider) => provider.providerId === 'google.com');

    if (!esGoogle) {
      throw new Error('La cuenta no corresponde a Google');
    }

    if (firebaseUser.emailVerified === false) {
      throw new Error('El correo de Google no esta verificado');
    }

    return firebaseUser;
  }

  static crearSesion(usuario) {
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    };
  }

  static verificarToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  static decodificarToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }
}

module.exports = AuthService;
