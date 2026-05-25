import { AuthenticationError } from '../../shared/errors/errors.js';
import { env } from '../../config/env.js';

const externalAuthMiddleware = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      throw new AuthenticationError('API Key requerida');
    }

    if (apiKey !== env.externalApiKey) {
      throw new AuthenticationError('API Key inválida');
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default externalAuthMiddleware;