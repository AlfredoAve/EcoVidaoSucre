const AuthService = require('../services/authService');

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const usuario = AuthService.verificarToken(token);

  if (!usuario) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  req.usuario = usuario;
  next();
}

module.exports = authMiddleware;
