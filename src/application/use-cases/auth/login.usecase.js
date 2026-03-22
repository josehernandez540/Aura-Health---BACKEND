import bcrypt from 'bcryptjs';
import { AuthenticationError } from '../../../shared/errors/errors.js';
import { AuditActions } from '../../../domain/constants/audit-actions.js';

class LoginUseCase {
  constructor(userRepository, jwtService) {
    this.userRepository = userRepository;
    this.jwtService =  jwtService;
  }

  async execute({ email, password }, context = {}) {
    const user = await this.userRepository.findByEmail(email);

    context.user = user;

    if (!user) {
      throw new AuthenticationError('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new AuthenticationError('Credenciales inválidas');
    }

    const token = this.jwtService.generateToken({
      userId: user.id,
      role: user.roles.name,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.roles.name,
      },
    };
  }
}

export default LoginUseCase;