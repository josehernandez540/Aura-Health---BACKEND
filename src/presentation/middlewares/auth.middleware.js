import jwtService from '../../infrastructure/security/jwt.service.js';
import { AuthenticationError } from '../../shared/errors/errors.js';

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AuthenticationError('Token requerido');
    }

    const [, token] = authHeader.split(' ');

    if (!token) {
      throw new AuthenticationError('Token inválido');
    }

    const decoded = jwtService.verifyToken(token);

    req.user = decoded;

    next();
  } catch (error) {
    next(new AuthenticationError('No autorizado'));
  }
};

export default authMiddleware;