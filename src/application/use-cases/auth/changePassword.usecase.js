import bcrypt from 'bcryptjs';
import { AuthenticationError, ValidationError } from '../../../shared/errors/errors.js';

class ChangePasswordUseCase {
  constructor(userRepository, jwtService) {
    this.userRepository = userRepository;
    this.jwtService = jwtService;
  }

  async execute({ userId, currentPassword, newPassword }) {
    if (!newPassword || newPassword.length < 8) {
      throw new ValidationError('La nueva contraseña debe tener al menos 8 caracteres');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AuthenticationError('Usuario no encontrado');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new AuthenticationError('La contraseña actual es incorrecta');
    }

    if (currentPassword === newPassword) {
      throw new ValidationError('La nueva contraseña debe ser diferente a la actual');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.userRepository.updatePassword(userId, hashedPassword);

    const token = this.jwtService.generateToken({
      userId: user.id,
      role: user.roles.name,
      mustChangePassword: false,
    });

    return { token, message: 'Contraseña actualizada exitosamente' };
  }
}

export default ChangePasswordUseCase;