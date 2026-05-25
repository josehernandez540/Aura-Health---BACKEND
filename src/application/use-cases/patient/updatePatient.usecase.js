import { NotFoundError } from '../../../shared/errors/errors.js';

class UpdatePatientUseCase {
  constructor(patientRepository, riskClassificationService) {
    this.patientRepository = patientRepository;
    this.riskClassificationService = riskClassificationService;
  }

  async execute({ patientId, name, birthDate, phone, email, diseaseCount }, context = {}) {
    const patient = await this.patientRepository.findById(patientId);
    if (!patient) {
      throw new NotFoundError(`Paciente con id ${patientId} no encontrado`);
    }

    const newDiseaseCount = diseaseCount ?? patient.disease_count ?? 0;

    const riskLevel = this.riskClassificationService.calculate(
      newDiseaseCount
    );

    const updated = await this.patientRepository.update(patientId, {
      name,
      birthDate,
      phone,
      email,
      diseaseCount: newDiseaseCount,
      riskLevel,
    });

    context.patient = updated;

    return {
      id: updated.id,
      name: updated.name,
      documentNumber: updated.document_number,
      birthDate: updated.birth_date,
      phone: updated.phone,
      email: updated.email,
      diseaseCount: updated.disease_count,
      riskLevel: updated.risk_level,
      isActive: updated.is_active,
      updatedAt: updated.updated_at,
    };
  }
}

export default UpdatePatientUseCase;