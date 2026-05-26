import { NotFoundError, ValidationError, AuthorizationError } from '../../../shared/errors/errors.js';

class CreateTreatmentUseCase {
  constructor(treatmentRepository, patientRepository, doctorRepository) {
    this.treatmentRepository = treatmentRepository;
    this.patientRepository = patientRepository;
    this.doctorRepository = doctorRepository;
  }

  async execute({ patientId, description, medications, doctorId, requiresApproval }, context = {}) {


    const patient = await this.patientRepository.findById(patientId);
    if (!patient) throw new NotFoundError(`Paciente con id ${patientId} no encontrado`);
    if (!patient.is_active) throw new ValidationError('El paciente no está activo');

    const doctor = await this.doctorRepository.findById(doctorId);
    if (!doctor) throw new NotFoundError(`Médico con id ${doctorId} no encontrado`);
    if (!doctor.is_active) throw new ValidationError('El médico no está activo');

    const userId = doctor.user_id;
    const status = requiresApproval ? 'PENDING_APPROVAL' : 'ACTIVE';

    const newTreatment = await this.treatmentRepository.create({
        patientId,
        doctorId,
        description,
        medications,
        changedBy: userId,
        requiresApproval,
        status,
    });

    context.treatment = newTreatment;

    return this._format(newTreatment, doctor, patient);
  }

  _format(treatment, doctor, patient) {
    return {
      id: treatment.id,
      description: treatment.description,
      status: treatment.status,
      createdAt: treatment.createdAt,
      medications: (treatment.medicationChanges ?? []).map((mc) => {
        try {
          return JSON.parse(mc.new_medication);
        } catch {
          return mc.new_medication;
        }
      }),
      doctor: {
        id: doctor.id,
        name: doctor.name,
        specialization: doctor.specialization,
      },
      patient: {
        id: patient.id,
        name: patient.name,
        documentNumber: patient.document_number,
      },
    };
  }
}

export default CreateTreatmentUseCase;