import {
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/errors.js';

class ApproveTreatmentUseCase {
  constructor(treatmentRepository) {
    this.treatmentRepository = treatmentRepository;
  }

  async execute({ treatmentId, approvedBy, notes }, context = {}) {

    const treatment = await this.treatmentRepository.findById(treatmentId);

    if (!treatment) {
      throw new NotFoundError(
        `Tratamiento con id ${treatmentId} no encontrado`
      );
    }

    if (!treatment.requiresApproval) {
      throw new ValidationError(
        'Este tratamiento no requiere aprobación'
      );
    }

    if (!treatment.isPendingApproval()) {
      throw new ValidationError(
        'El tratamiento ya fue aprobado o no está pendiente'
      );
    }

    const approved = await this.treatmentRepository.approve(
      treatmentId,
      approvedBy,
      notes
    );

    context.treatment = approved;

    return {
      id: approved.id,
      status: approved.status,
      approvedBy: approved.approvedBy,
      approvedAt: approved.approvedAt,
    };
  }
}

export default ApproveTreatmentUseCase;