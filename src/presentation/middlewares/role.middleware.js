import { AppError } from "../../shared/errors/AppError.js";
import { AuthenticationError } from '../../shared/errors/errors.js';

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const user = req.user;
    
    if (!user || !user.role) {
      return next(new AuthenticationError("No autorizado"));
    }

    if (!allowedRoles.includes(user.role)) {
      return next(new AuthenticationError("Acceso denegado"));
    }

    next();
  };
};