import { NotFoundError, ValidationError } from '../../../shared/errors/errors.js';
import { Treatment } from '../../../domain/entities/treatment.entity.js';

class UpdateTreatmentStatusUseCase {
  constructor(treatmentRepository) {
    this.treatmentRepository = treatmentRepository;
  }

  async execute({ treatmentId, status }, context = {}) {
    if (!Treatment.isValidStatus(status)) {
      throw new ValidationError(
        `Estado inválido. Valores permitidos: ACTIVE, COMPLETED, PENDING_APPROVAL`
      );
    }

    const treatment = await this.treatmentRepository.findById(treatmentId);
    if (!treatment) {
      throw new NotFoundError(`Tratamiento con id ${treatmentId} no encontrado`);
    }

    const updated = await this.treatmentRepository.updateStatus(treatmentId, status);

    context.treatment = updated;

    return {
      id: updated.id,
      description: updated.description,
      status: updated.status,
      patientId: updated.patientId,
      doctorId: updated.doctorId,
      createdAt: updated.createdAt,
    };
  }
}

export default UpdateTreatmentStatusUseCase;