import { NotFoundError, ValidationError } from '../../../shared/errors/errors.js';

class ToggleAdminStatusUseCase {
  constructor(adminUserRepository) {
    this.adminUserRepository = adminUserRepository;
  }

  async execute({ adminId, status, requestingUserId }, context = {}) {
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      throw new ValidationError('Estado inválido. Valores permitidos: ACTIVE, INACTIVE');
    }

    const admin = await this.adminUserRepository.findById(adminId);
    if (!admin) {
      throw new NotFoundError(`Administrador con id ${adminId} no encontrado`);
    }

    if (status === 'INACTIVE' && adminId === requestingUserId) {
      throw new ValidationError('No puedes desactivar tu propia cuenta de administrador');
    }

    if (status === 'INACTIVE') {
      const activeCount = await this.adminUserRepository.countActiveAdmins();
      if (activeCount <= 1) {
        throw new ValidationError(
          'No se puede inactivar al último administrador activo del sistema'
        );
      }
    }

    const isActive = status === 'ACTIVE';
    const updated = await this.adminUserRepository.updateStatus(adminId, isActive);

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

export default ToggleAdminStatusUseCase;