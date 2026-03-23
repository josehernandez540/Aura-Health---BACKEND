import { jest } from '@jest/globals';
import CreateAppointmentUseCase from '../src/application/use-cases/appointment/createAppointment.usecase.js';


const DOCTOR = {
  id: 'doc-uuid-1',
  name: 'Dr. House',
  specialization: 'Diagnóstico',
  is_active: true,
  document_number: null,
};

const PATIENT = {
  id: 'pat-uuid-1',
  name: 'María García',
  document_number: '1234567890',
  is_active: true,
};

const APPOINTMENT = {
  id: 'appt-uuid-1',
  doctorId: DOCTOR.id,
  patientId: PATIENT.id,
  date: new Date('2099-12-15'),
  startTime: '09:00',
  endTime: '09:30',
  status: 'SCHEDULED',
  notes: null,
  createdAt: new Date(),
  doctor: { id: DOCTOR.id, name: DOCTOR.name, specialization: DOCTOR.specialization },
  patient: { id: PATIENT.id, name: PATIENT.name, documentNumber: PATIENT.document_number },
};

const VALID_INPUT = {
  doctorId: DOCTOR.id,
  patientId: PATIENT.id,
  date: '2099-12-15',
  startTime: '09:00',
  endTime: '09:30',
  notes: 'Revisión anual',
  createdBy: 'admin-uuid',
};

function buildRepos({
  doctor = DOCTOR,
  patient = PATIENT,
  conflict = null,
  created = APPOINTMENT,
} = {}) {
  const appointmentRepository = {
    findConflict: jest.fn().mockResolvedValue(conflict),
    create: jest.fn().mockResolvedValue(created),
  };
  const doctorRepository = {
    findById: jest.fn().mockResolvedValue(doctor),
  };
  const patientRepository = {
    findById: jest.fn().mockResolvedValue(patient),
  };
  return { appointmentRepository, doctorRepository, patientRepository };
}

function makeUseCase(repos) {
  return new CreateAppointmentUseCase(
    repos.appointmentRepository,
    repos.doctorRepository,
    repos.patientRepository
  );
}

describe('CreateAppointmentUseCase', () => {
  it('should create appointment and return confirmation', async () => {
    const repos = buildRepos();
    const useCase = makeUseCase(repos);

    const result = await useCase.execute(VALID_INPUT);

    expect(repos.appointmentRepository.findConflict).toHaveBeenCalledWith(
      expect.objectContaining({
        doctorId: DOCTOR.id,
        date: '2099-12-15',
        startTime: '09:00',
        endTime: '09:30',
      })
    );
    expect(repos.appointmentRepository.create).toHaveBeenCalledTimes(1);
    expect(result.confirmationId).toBe(APPOINTMENT.id);
    expect(result.status).toBe('SCHEDULED');
    expect(result.message).toMatch(/Cita confirmada/);
    expect(result.doctor.name).toBe(DOCTOR.name);
    expect(result.patient.name).toBe(PATIENT.name);
  });

  it('should populate context.appointment after creation', async () => {
    const repos = buildRepos();
    const useCase = makeUseCase(repos);
    const context = {};

    await useCase.execute(VALID_INPUT, context);

    expect(context.appointment).toBeDefined();
    expect(context.appointment.id).toBe(APPOINTMENT.id);
  });

  it('should throw NotFoundError when doctor does not exist', async () => {
    const repos = buildRepos({ doctor: null });
    const useCase = makeUseCase(repos);

    await expect(useCase.execute(VALID_INPUT)).rejects.toMatchObject({
      statusCode: 404,
      errorCode: 'NOT_FOUND',
    });
    expect(repos.appointmentRepository.create).not.toHaveBeenCalled();
  });

  it('should throw ValidationError when doctor is inactive', async () => {
    const repos = buildRepos({ doctor: { ...DOCTOR, is_active: false } });
    const useCase = makeUseCase(repos);

    await expect(useCase.execute(VALID_INPUT)).rejects.toMatchObject({
      statusCode: 400,
      errorCode: 'VALIDATION_ERROR',
    });
    expect(repos.appointmentRepository.create).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when patient does not exist', async () => {
    const repos = buildRepos({ patient: null });
    const useCase = makeUseCase(repos);

    await expect(useCase.execute(VALID_INPUT)).rejects.toMatchObject({
      statusCode: 404,
      errorCode: 'NOT_FOUND',
    });
    expect(repos.appointmentRepository.create).not.toHaveBeenCalled();
  });

  it('should throw ValidationError when patient is inactive', async () => {
    const repos = buildRepos({ patient: { ...PATIENT, is_active: false } });
    const useCase = makeUseCase(repos);

    await expect(useCase.execute(VALID_INPUT)).rejects.toMatchObject({
      statusCode: 400,
      errorCode: 'VALIDATION_ERROR',
    });
    expect(repos.appointmentRepository.create).not.toHaveBeenCalled();
  });

  it('should throw ConflictError when doctor has overlapping appointment', async () => {
    const conflictingAppt = { ...APPOINTMENT, startTime: '08:45', endTime: '09:15' };
    const repos = buildRepos({ conflict: conflictingAppt });
    const useCase = makeUseCase(repos);

    await expect(useCase.execute(VALID_INPUT)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'CONFLICT_ERROR',
    });
    expect(repos.appointmentRepository.create).not.toHaveBeenCalled();
  });

  it('conflict error message should include the blocking time slot', async () => {
    const conflictingAppt = { ...APPOINTMENT, startTime: '08:45', endTime: '09:15' };
    const repos = buildRepos({ conflict: conflictingAppt });
    const useCase = makeUseCase(repos);

    let error;
    try {
      await useCase.execute(VALID_INPUT);
    } catch (e) {
      error = e;
    }

    expect(error.message).toMatch('08:45');
    expect(error.message).toMatch('09:15');
  });

  it('should pass all required fields to repository.create', async () => {
    const repos = buildRepos();
    const useCase = makeUseCase(repos);

    await useCase.execute(VALID_INPUT);

    expect(repos.appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        doctorId: VALID_INPUT.doctorId,
        patientId: VALID_INPUT.patientId,
        date: VALID_INPUT.date,
        startTime: VALID_INPUT.startTime,
        endTime: VALID_INPUT.endTime,
        notes: VALID_INPUT.notes,
        createdBy: VALID_INPUT.createdBy,
      })
    );
  });
});