import bcrypt from 'bcryptjs';
import { AuthenticationError } from '../../../shared/errors/errors.js';

class LoginUseCase {
  constructor(userRepository, jwtService) {
    this.userRepository = userRepository;
    this.jwtService =  jwtService;
  }

  async execute({ email, password }) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new AuthenticationError('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new AuthenticationError('Credenciales inválidas');
    }

    const token = this.jwtService.generateToken({
      userId: user.id,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}

export default LoginUseCase;