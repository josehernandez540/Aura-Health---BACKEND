import bcrypt from 'bcryptjs';
import { ConflictError } from '../../../shared/errors/errors.js';

function generateTempPassword() {
  const digits = Math.floor(1000 + Math.random() * 9000);
  const specials = '!@#$%&*';
  const special = specials[Math.floor(Math.random() * specials.length)];
  return `Aura${digits}${special}`;
}

class CreateAdminUserUseCase {
  constructor(adminUserRepository, emailService) {
    this.adminUserRepository = adminUserRepository;
    this.emailService = emailService;
  }

  async execute({ email, name }, context = {}) {
    const existing = await this.adminUserRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError('El correo electrónico ya está registrado');
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const user = await this.adminUserRepository.create({
      email,
      password: hashedPassword,
      name,
    });

    context.user = user;

    try {
      await this.emailService.sendWelcomeEmail({
        to: email,
        name: name ?? email,
        tempPassword,
      });
    } catch (emailError) {
      console.error('Error sending welcome email to admin:', emailError.message);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}

export default CreateAdminUserUseCase;