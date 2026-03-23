import { NotFoundError, ValidationError } from '../../../shared/errors/errors.js';

const FINAL_STATUSES = ['CANCELLED', 'COMPLETED', 'NO_SHOW'];
const ALLOWED_TRANSITIONS = {
  SCHEDULED: ['CANCELLED', 'COMPLETED', 'NO_SHOW'],
};

class UpdateAppointmentStatusUseCase {
  constructor(appointmentRepository) {
    this.appointmentRepository = appointmentRepository;
  }

  async execute({ appointmentId, status, performedBy, notes }, context = {}) {
    if (!FINAL_STATUSES.includes(status)) {
      throw new ValidationError(
        `Estado inválido. Valores permitidos: ${FINAL_STATUSES.join(', ')}`
      );
    }

    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundError(`Cita con id ${appointmentId} no encontrada`);
    }

    const allowed = ALLOWED_TRANSITIONS[appointment.status] ?? [];
    if (!allowed.includes(status)) {
      throw new ValidationError(
        `No se puede cambiar el estado de '${appointment.status}' a '${status}'`
      );
    }

    const updated = await this.appointmentRepository.updateStatus(
      appointmentId,
      status,
      performedBy
    );

    context.appointment = updated;

    return {
      id: updated.id,
      status: updated.status,
      date: updated.date,
      startTime: updated.startTime,
      endTime: updated.endTime,
      doctorId: updated.doctorId,
      patientId: updated.patientId,
    };
  }
}

export default UpdateAppointmentStatusUseCase;