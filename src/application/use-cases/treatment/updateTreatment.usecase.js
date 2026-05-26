import {
  NotFoundError,
} from '../../../shared/errors/errors.js';

class UpdateTreatmentUseCase {
  constructor(
    treatmentRepository,
    treatmentHistoryRepository
  ) {
    this.treatmentRepository = treatmentRepository;
    this.treatmentHistoryRepository = treatmentHistoryRepository;
  }

  async execute({
    treatmentId,
    description,
    medications,
    changedBy,
    reason,
  }) {

    const treatment =
      await this.treatmentRepository.findById(treatmentId);

    if (!treatment) {
      throw new NotFoundError(
        `Tratamiento ${treatmentId} no encontrado`
      );
    }

    const lastVersion =
      await this.treatmentHistoryRepository
        .getLastVersion(treatmentId);

    await this.treatmentHistoryRepository.create({
      treatmentId,

      version: lastVersion + 1,

      previousDescription: treatment.description,
      newDescription: description ?? treatment.description,

      previousMedications: treatment.medications,
      newMedications: medications ?? treatment.medications,

      changedBy,

      changeReason: reason,
    });

    const updated =
      await this.treatmentRepository.update(
        treatmentId,
        {
          description,
          medications,
          changedBy,
        }
      );

    return updated;
  }
}

export default UpdateTreatmentUseCase;