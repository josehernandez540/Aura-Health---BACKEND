import { NotFoundError, ValidationError, ConflictError } from '../../../shared/errors/errors.js';

class RescheduleAppointmentUseCase {
  constructor(appointmentRepository, emailService) {
    this.appointmentRepository = appointmentRepository;
    this.emailService = emailService;
  }

  async execute(
    { appointmentId, newDate, newStartTime, newEndTime, reason, performedBy },
    context = {}
  ) {
    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundError(`Cita con id ${appointmentId} no encontrada`);
    }

    if (appointment.status !== 'SCHEDULED') {
      throw new ValidationError(
        `Solo se pueden reprogramar citas en estado SCHEDULED. Estado actual: ${appointment.status}`
      );
    }

    this._guardFutureSlot(newDate, newStartTime);

    const conflict = await this.appointmentRepository.findConflict({
      doctorId: appointment.doctorId,
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      excludeId: appointmentId,
    });

    if (conflict) {
      throw new ConflictError(
        `El médico ya tiene una cita programada de ${conflict.startTime} a ${conflict.endTime} ` +
          `en esa fecha. Por favor elija otro horario.`
      );
    }

    const previousDate = appointment.date;
    const previousStartTime = appointment.startTime;
    const previousEndTime = appointment.endTime;

    const updated = await this.appointmentRepository.reschedule({
      appointmentId,
      newDate,
      newStartTime,
      newEndTime,
      reason: reason ?? null,
      performedBy: performedBy ?? null,
      previousDate,
      previousStartTime,
      previousEndTime,
    });

    context.appointment = updated;

    try {
      if (updated.patient?.email) {
        await this.emailService.sendAppointmentRescheduleEmail({
          to: updated.patient.email,
          patientName: updated.patient.name,
          doctorName: updated.doctor?.name ?? 'su médico',
          previousDate,
          previousStartTime,
          previousEndTime,
          newDate: updated.date,
          newStartTime: updated.startTime,
          newEndTime: updated.endTime,
          reason,
        });
      }
    } catch (emailError) {
      console.error('Error sending reschedule notification:', emailError.message);
    }

    const dateLabel = new Date(updated.date).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });

    return {
      id: updated.id,
      status: updated.status,
      message: `Cita reprogramada para el ${dateLabel} de ${updated.startTime} a ${updated.endTime}`,
      appointment: {
        id: updated.id,
        date: updated.date,
        startTime: updated.startTime,
        endTime: updated.endTime,
        status: updated.status,
        notes: updated.notes,
      },
      previous: {
        date: previousDate,
        startTime: previousStartTime,
        endTime: previousEndTime,
      },
      doctor: updated.doctor,
      patient: updated.patient
        ? {
            id: updated.patient.id,
            name: updated.patient.name,
            documentNumber: updated.patient.documentNumber,
          }
        : null,
    };
  }

  _guardFutureSlot(dateStr, startTime) {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    if (dateStr < today) {
      throw new ValidationError('No se pueden programar citas en fechas pasadas');
    }

    if (dateStr === today) {
      const [hh, mm] = startTime.split(':').map(Number);
      const slotMinutes = hh * 60 + mm;
      const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
      if (slotMinutes <= nowMinutes) {
        throw new ValidationError(
          'La hora de inicio de la cita debe ser posterior a la hora actual'
        );
      }
    }
  }
}

export default RescheduleAppointmentUseCase;