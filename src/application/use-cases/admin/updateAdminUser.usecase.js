import { ConflictError, NotFoundError } from '../../../shared/errors/errors.js';

class UpdateAdminUserUseCase {
  constructor(adminUserRepository) {
    this.adminUserRepository = adminUserRepository;
  }

  async execute({ adminId, email }, context = {}) {
    const existing = await this.adminUserRepository.findById(adminId);
    if (!existing) {
      throw new NotFoundError(`Administrador con id ${adminId} no encontrado`);
    }

    if (email && email !== existing.email) {
      const emailTaken = await this.adminUserRepository.findByEmail(email);
      if (emailTaken && emailTaken.id !== adminId) {
        throw new ConflictError('El correo electrónico ya está en uso por otro usuario');
      }
    }

    const updated = await this.adminUserRepository.update(adminId, { email });

    context.user = updated;

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt,
    };
  }
}

export default UpdateAdminUserUseCase;