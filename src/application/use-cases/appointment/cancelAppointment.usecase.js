import { NotFoundError, ValidationError } from '../../../shared/errors/errors.js';

class CancelAppointmentUseCase {

  constructor(appointmentRepository, patientRepository, emailService) {
    this.appointmentRepository = appointmentRepository;
    this.patientRepository = patientRepository;
    this.emailService = emailService;
  }

  
  async execute({ appointmentId, reason, performedBy }, context = {}) {
    if (!reason || reason.trim().length < 10) {
      throw new ValidationError('El motivo de cancelación es requerido (mínimo 10 caracteres)');
    }

    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundError(`Cita con id ${appointmentId} no encontrada`);
    }

    if (appointment.status !== 'SCHEDULED') {
      throw new ValidationError(
        `No se puede cancelar una cita en estado '${appointment.status}'. ` +
          `Solo se permiten cancelaciones sobre citas en estado SCHEDULED.`
      );
    }

    const cancelled = await this.appointmentRepository.cancelWithReason(
      appointmentId,
      reason,
      performedBy
    );

    context.appointment = cancelled;

    await this._notifyPatient(cancelled, reason);

    return {
      id: cancelled.id,
      status: cancelled.status,
      reason: cancelled.cancellationReason,
      date: cancelled.date,
      startTime: cancelled.startTime,
      endTime: cancelled.endTime,
      doctorId: cancelled.doctorId,
      patientId: cancelled.patientId,
      cancelledBy: performedBy,
      cancelledAt: cancelled.cancelledAt,
    };
  }


  async _notifyPatient(appointment, reason) {
    try {
        
      const patient = await this.patientRepository.findById(appointment.patientId);
      if (!patient?.email) {
        console.warn(
          `[CancelAppointment] Paciente ${appointment.patientId} sin email — omitiendo notificación`
        );
        return;
      }

      const dateLabel = new Date(appointment.date).toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      });

      await this.emailService.sendAppointmentCancellationEmail({
        to: patient.email,
        patientName: patient.name,
        date: dateLabel,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        doctorName: appointment.doctor?.name ?? 'Médico asignado',
        specialization: appointment.doctor?.specialization,
        reason,
      });
    } catch (emailError) {
      console.error('[CancelAppointment] Error al enviar email de notificación:', emailError.message);
    }
  }
}

export default CancelAppointmentUseCase;