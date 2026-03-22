import jwtService from '../../infrastructure/security/jwt.service.js';
import { AuthenticationError } from '../../shared/errors/errors.js';
import prisma from '../../config/database.js';

const authMiddleware = async (req, res, next) => {
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

    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: { is_active: true },
    });

    if (!user || user.is_active === false) {
      throw new AuthenticationError('Usuario inactivo. Contacte al administrador');
    }

    req.user = decoded;

    next();
  } catch (error) {
    next(new AuthenticationError('No autorizado'));
  }
};

export default authMiddleware;