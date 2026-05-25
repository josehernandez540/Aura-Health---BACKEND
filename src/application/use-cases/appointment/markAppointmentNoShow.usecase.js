import {
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/errors.js';

class MarkAppointmentNoShowUseCase {
  constructor(appointmentRepository) {
    this.appointmentRepository = appointmentRepository;
  }

  async execute(
    { appointmentId, reason, performedBy },
    context = {},
  ) {
    const appointment =
      await this.appointmentRepository.findById(appointmentId);

    if (!appointment) {
      throw new NotFoundError(
        `Cita con id ${appointmentId} no encontrada`,
      );
    }

    if (appointment.status !== 'SCHEDULED') {
      throw new ValidationError(
        `Solo se pueden marcar como NO_SHOW citas en estado SCHEDULED`,
      );
    }

    const updated =
      await this.appointmentRepository.markAsNoShow(
        appointmentId,
        reason,
        performedBy,
      );

    context.appointment = updated;

    return {
      id: updated.id,
      status: updated.status,
      reason: reason ?? null,
      date: updated.date,
      startTime: updated.startTime,
      endTime: updated.endTime,
      doctorId: updated.doctorId,
      patientId: updated.patientId,
      markedBy: performedBy,
    };
  }
}

export default MarkAppointmentNoShowUseCase;