import bcrypt from 'bcryptjs';
import { AuthenticationError } from '../../../shared/errors/errors.js';

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

    if (user.is_active === false) {
      throw new AuthenticationError('Usuario inactivo. Contacte al administrador');
    }

    
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      throw new AuthenticationError('Credenciales inválidas');
    }

    const mustChangePassword = user.must_change_password === true;

    const token = this.jwtService.generateToken({
      userId: user.id,
      role: user.roles.name,
      mustChangePassword,
    });

    return {
      token,
      mustChangePassword,
      user: {
        id: user.id,
        email: user.email,
        role: user.roles.name,
      },
    };
  }
}

export default LoginUseCase;