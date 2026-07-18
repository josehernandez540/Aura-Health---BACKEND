import { NotFoundError, ValidationError } from '../../../shared/errors/errors.js';

class ValidateMedicalRecordUseCase {
  constructor(medicalRecordRepository) {
    this.medicalRecordRepository = medicalRecordRepository;
  }

  async execute({ recordId, validatedBy }) {
    const record = await this.medicalRecordRepository.findById(recordId);

    if (!record) {
      throw new NotFoundError('Registro médico no encontrado');
    }

    if (record.validated_at) {
      throw new ValidationError('Este registro ya fue validado');
    }

    return this.medicalRecordRepository.validate(recordId, validatedBy);
  }
}

export default ValidateMedicalRecordUseCase;
