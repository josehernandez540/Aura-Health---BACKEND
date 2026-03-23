import { NotFoundError, ValidationError } from '../../../shared/errors/errors.js';
import { Patient } from '../../../domain/entities/patient.entity.js';

class TogglePatientStatusUseCase {
  constructor(patientRepository) {
    this.patientRepository = patientRepository;
  }

  async execute({ patientId, status }, context = {}) {
    if (!Patient.isValidStatus(status)) {
      throw new ValidationError(`Estado inválido. Valores permitidos: ACTIVE, INACTIVE`);
    }

    const patient = await this.patientRepository.findById(patientId);
    if (!patient) {
      throw new NotFoundError(`Paciente con id ${patientId} no encontrado`);
    }

    const isActive = status === 'ACTIVE';
    const updated = await this.patientRepository.updateStatus(patientId, isActive);

    context.patient = updated;

    return {
      id: updated.id,
      name: updated.name,
      documentNumber: updated.document_number,
      isActive: updated.is_active,
      updatedAt: updated.updated_at,
    };
  }
}

export default TogglePatientStatusUseCase;