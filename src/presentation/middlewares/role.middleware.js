import { AuthenticationError, AuthorizationError } from '../../shared/errors/errors.js';

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user?.role) {
      return next(new AuthenticationError("No autorizado"));
    }

    if (!allowedRoles.includes(user.role)) {
      return next(new AuthorizationError("Acceso denegado"));
    }

    next();
  };
};