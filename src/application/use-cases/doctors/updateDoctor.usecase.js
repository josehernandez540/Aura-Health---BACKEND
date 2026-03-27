import { NotFoundError } from '../../../shared/errors/errors.js';

class UpdateDoctorUseCase {
  constructor(doctorRepository) {
    this.doctorRepository = doctorRepository;
  }

  async execute({ doctorId, name, specialization, licenseNumber, phone }, context = {}) {
    const doctor = await this.doctorRepository.findById(doctorId);
    if (!doctor) {
      throw new NotFoundError(`Médico con id ${doctorId} no encontrado`);
    }

    const updated = await this.doctorRepository.update(doctorId, {
      name,
      specialization,
      licenseNumber,
      phone,
    });

    context.doctor = updated;

    return {
      id: updated.id,
      name: updated.name,
      specialization: updated.specialization,
      licenseNumber: updated.license_number,
      isActive: updated.is_active,
    };
  }
}

export default UpdateDoctorUseCase;