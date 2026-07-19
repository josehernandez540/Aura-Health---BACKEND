import {
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/errors.js';

class CompleteAppointmentUseCase {
  constructor(appointmentRepository) {
    this.appointmentRepository = appointmentRepository;
  }

  async execute(
    { appointmentId, notes, performedBy },
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
        `Solo se pueden completar citas en estado SCHEDULED`,
      );
    }

    const updated =
      await this.appointmentRepository.markAsCompleted(
        appointmentId,
        notes,
        performedBy,
      );

    context.appointment = updated;

    return {
      id: updated.id,
      status: updated.status,
      notes: notes ?? null,
      date: updated.date,
      startTime: updated.startTime,
      endTime: updated.endTime,
      doctorId: updated.doctorId,
      patientId: updated.patientId,
      completedBy: performedBy,
    };
  }
}

export default CompleteAppointmentUseCase;
