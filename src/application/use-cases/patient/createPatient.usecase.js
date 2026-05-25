import { ConflictError } from '../../../shared/errors/errors.js';

class CreatePatientUseCase {
  constructor(patientRepository, riskClassificationService) {
    this.patientRepository = patientRepository;
    this.riskClassificationService = riskClassificationService;
  }

  async execute({ name, documentNumber, birthDate, phone, email, diseaseCount }, context = {}) {
    const existing = await this.patientRepository.findByDocumentNumber(documentNumber);
    if (existing) {
      throw new ConflictError('Ya existe un paciente con ese número de identificación');
    }

    const riskLevel = this.riskClassificationService.calculate(
      diseaseCount
    );

    const patient = await this.patientRepository.create({
      name,
      documentNumber,
      birthDate,
      phone,
      email,
      diseaseCount,
      riskLevel,
    });

    context.patient = patient;

    return {
      id: patient.id,
      name: patient.name,
      documentNumber: patient.document_number,
      birthDate: patient.birth_date,
      phone: patient.phone,
      email: patient.email,
      diseaseCount: patient.disease_count,
      riskLevel: patient.risk_level,
      isActive: patient.is_active,
      createdAt: patient.created_at,
    };
  }
}

export default CreatePatientUseCase;