import PrismaUserRepository from '../../infrastructure/repositories/user.repository.js';
import LoginUseCase from '../../application/use-cases/auth/login.usecase.js';
import jwtService from '../../infrastructure/security/jwt.service.js';
import { successResponse } from '../../shared/utils/apiResponse.js';

const userRepository = new PrismaUserRepository();
const loginUseCase = new LoginUseCase(userRepository, jwtService);

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const result = await loginUseCase.execute({ email, password });

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();