const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/userRepository');

if (!process.env.JWT_SECRET) {
  console.warn('ADVERTENCIA: JWT_SECRET no está definido en variables de entorno. Usando valor por defecto inseguro.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'ecovida-secret-key-2025';

class AuthService {
  static async registrarUsuario(nombre, email, contrasena, rol = 'cliente') {
    const usuarioExistente = await UserRepository.obtenerPorEmail(email);
    if (usuarioExistente) {
      throw new Error('El email ya está registrado');
    }

    const contrasenaHash = await bcryptjs.hash(contrasena, 10);
    const Usuario = require('../models/Usuario');
    const nuevoUsuario = new Usuario(nombre, email, contrasenaHash, rol);

    const usuarioId = await UserRepository.crearUsuario(nuevoUsuario);
    return { id: usuarioId, nombre, email, rol };
  }

  static async loginUsuario(email, contrasena) {
    const usuario = await UserRepository.obtenerPorEmail(email);
    if (!usuario) {
      throw new Error('Email o contraseña incorrectos');
    }

    if (!usuario.activo) {
      throw new Error('Usuario desactivado');
    }

    const contrasenaValida = await bcryptjs.compare(contrasena, usuario.contrasena);
    if (!contrasenaValida) {
      throw new Error('Email o contraseña incorrectos');
    }

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
