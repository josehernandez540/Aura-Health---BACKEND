import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

class JwtService {
  generateToken(payload) {
    return jwt.sign(payload, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, env.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

export default new JwtService();