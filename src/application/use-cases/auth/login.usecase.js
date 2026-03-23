import bcrypt from 'bcryptjs';
import { AuthenticationError } from '../../../shared/errors/errors.js';
import { User } from '../../../domain/entities/user.entity.js';

class LoginUseCase {
  constructor(userRepository, jwtService) {
    this.userRepository = userRepository;
    this.jwtService =  jwtService;
  }

  async execute({ email, password }, context = {}) {
    const userData = await this.userRepository.findByEmail(email);

    context.user = userData;

    if (!userData) {
      throw new AuthenticationError('Credenciales inválidas');
    }

    const user = new User({
      id: userData.id,
      email: userData.email,
      password: userData.password,
      role: userData.roles.name,
      isActive: userData.is_active,
      mustChangePassword: userData.must_change_password,
    });

    if (!user.canAuthenticate()) {
      throw new AuthenticationError('Usuario inactivo. Contacte al administrador');
    }

    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      throw new AuthenticationError('Credenciales inválidas');
    }

    const token = this.jwtService.generateToken({
      userId: userData.id,
      role: userData.roles.name,
      mustChangePassword: user.requiresPasswordChange(),
    });

    return {
      token,
      mustChangePassword: user.requiresPasswordChange(),
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.roles.name,
      },
    };
  }
}

export default LoginUseCase;