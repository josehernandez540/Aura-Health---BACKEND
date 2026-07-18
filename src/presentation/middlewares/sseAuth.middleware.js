import jwtService from '../../infrastructure/security/jwt.service.js';
import { AuthenticationError } from '../../shared/errors/errors.js';
import prisma from '../../config/database.js';

// The browser's native EventSource cannot set an Authorization header,
// so the SSE stream accepts the JWT as a query param instead.
const sseAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.query.token;

    if (!token) {
      throw new AuthenticationError('Token requerido');
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
  } catch {
    next(new AuthenticationError('No autorizado'));
  }
};

export default sseAuthMiddleware;
