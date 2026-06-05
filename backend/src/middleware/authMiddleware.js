const AuthService = require('../services/authService');
const UserRepository = require('../repositories/userRepository');

async function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const tokenData = AuthService.verificarToken(token);
    if (!tokenData) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const usuario = await UserRepository.obtenerPorId(tokenData.id);
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Usuario no disponible' });
    }

    req.usuario = {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol
    };
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error al validar la sesión' });
  }
}

module.exports = authMiddleware;
