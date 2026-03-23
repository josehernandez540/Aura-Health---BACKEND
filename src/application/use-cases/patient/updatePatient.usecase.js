import { NotFoundError } from '../../../shared/errors/errors.js';

class UpdatePatientUseCase {
  constructor(patientRepository) {
    this.patientRepository = patientRepository;
  }

  async execute({ patientId, name, birthDate, phone, email }, context = {}) {
    const patient = await this.patientRepository.findById(patientId);
    if (!patient) {
      throw new NotFoundError(`Paciente con id ${patientId} no encontrado`);
    }

    const updated = await this.patientRepository.update(patientId, {
      name,
      birthDate,
      phone,
      email,
    });

    context.patient = updated;

    return {
      id: updated.id,
      name: updated.name,
      documentNumber: updated.document_number,
      birthDate: updated.birth_date,
      phone: updated.phone,
      email: updated.email,
      isActive: updated.is_active,
      updatedAt: updated.updated_at,
    };
  }
}

export default UpdatePatientUseCase;