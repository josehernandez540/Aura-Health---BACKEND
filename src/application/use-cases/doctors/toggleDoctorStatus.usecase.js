import { NotFoundError, ValidationError } from '../../../shared/errors/errors.js';
import { Doctor } from '../../../domain/entities/doctor.entity.js';


class ToggleDoctorStatusUseCase {
  constructor(doctorRepository) {
    this.doctorRepository = doctorRepository;
  }

  async execute({ doctorId, status, performedBy }, context = {}) {
    
    if (!Doctor.isValidStatus(status)) {
      throw new ValidationError(`Estado inválido. Valores permitidos: ACTIVE, INACTIVE`);
    }

    const doctor = await this.doctorRepository.findById(doctorId);
    if (!doctor) {
      throw new NotFoundError(`Médico con id ${doctorId} no encontrado`);
    }

    const updated = await this.doctorRepository.updateStatus(doctorId, status, performedBy);

    context.doctor = updated;

    return {
      id: updated.id,
      name: updated.name,
      is_active: updated.is_active,
      status_changed_by: performedBy,
      status_changed_at: updated.status_changed_at,
    };
  }
}

export default ToggleDoctorStatusUseCase;