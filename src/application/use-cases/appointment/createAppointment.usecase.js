import { NotFoundError, ValidationError, ConflictError } from '../../../shared/errors/errors.js';

class CreateAppointmentUseCase {
  constructor(appointmentRepository, doctorRepository, patientRepository) {
    this.appointmentRepository = appointmentRepository;
    this.doctorRepository = doctorRepository;
    this.patientRepository = patientRepository;
  }

  async execute(
    { doctorId, patientId, date, startTime, endTime, notes, createdBy },
    context = {}
  ) {

    const doctor = await this.doctorRepository.findById(doctorId);
    if (!doctor) {
      throw new NotFoundError(`Médico con id ${doctorId} no encontrado`);
    }
    if (!doctor.is_active) {
      throw new ValidationError('El médico seleccionado no está activo');
    }

    const patient = await this.patientRepository.findById(patientId);
    if (!patient) {
      throw new NotFoundError(`Paciente con id ${patientId} no encontrado`);
    }
    if (patient.is_active === false) {
      throw new ValidationError('El paciente seleccionado no está activo');
    }

    this._guardFutureSlot(date, startTime);

    const conflict = await this.appointmentRepository.findConflict({
      doctorId,
      date,
      startTime,
      endTime,
    });

    if (conflict) {
      throw new ConflictError(
        `El médico ya tiene una cita programada de ${conflict.startTime} a ${conflict.endTime} ` +
          `en esa fecha. Por favor elija otro horario.`
      );
    }

    const appointment = await this.appointmentRepository.create({
      doctorId,
      patientId,
      date,
      startTime,
      endTime,
      notes,
      createdBy,
    });

    context.appointment = appointment;

    return this._buildConfirmation(appointment, doctor, patient);
  }

  _guardFutureSlot(dateStr, startTime) {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

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

  _buildConfirmation(appointment, doctor, patient) {
    const dateLabel = new Date(appointment.date).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });

    return {
      confirmationId: appointment.id,
      status: appointment.status,
      message: `Cita confirmada para el ${dateLabel} de ${appointment.startTime} a ${appointment.endTime}`,
      appointment: {
        id: appointment.id,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        notes: appointment.notes,
        createdAt: appointment.createdAt,
      },
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

export default CreateAppointmentUseCase;