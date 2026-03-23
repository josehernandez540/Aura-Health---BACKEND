import { jest } from '@jest/globals';
import UpdateAppointmentStatusUseCase from '../src/application/use-cases/appointment/updateAppointmentStatus.usecase.js';

const SCHEDULED_APPT = {
  id: 'appt-uuid-1',
  doctorId: 'doc-uuid-1',
  patientId: 'pat-uuid-1',
  date: new Date('2099-12-15'),
  startTime: '09:00',
  endTime: '09:30',
  status: 'SCHEDULED',
};

function buildRepo(overrides = {}) {
  return {
    findById: jest.fn().mockResolvedValue(SCHEDULED_APPT),
    updateStatus: jest.fn().mockImplementation(async (id, status) => ({
      ...SCHEDULED_APPT,
      status,
    })),
    ...overrides,
  };
}

describe('UpdateAppointmentStatusUseCase', () => {
  it('should cancel a SCHEDULED appointment', async () => {
    const repo = buildRepo();
    const useCase = new UpdateAppointmentStatusUseCase(repo);

    const result = await useCase.execute({
      appointmentId: 'appt-uuid-1',
      status: 'CANCELLED',
      performedBy: 'admin-uuid',
    });

    expect(repo.updateStatus).toHaveBeenCalledWith('appt-uuid-1', 'CANCELLED', 'admin-uuid');
    expect(result.status).toBe('CANCELLED');
  });

  it('should mark appointment as COMPLETED', async () => {
    const repo = buildRepo();
    const useCase = new UpdateAppointmentStatusUseCase(repo);

    const result = await useCase.execute({
      appointmentId: 'appt-uuid-1',
      status: 'COMPLETED',
      performedBy: 'admin-uuid',
    });

    expect(result.status).toBe('COMPLETED');
  });

  it('should mark appointment as NO_SHOW', async () => {
    const repo = buildRepo();
    const useCase = new UpdateAppointmentStatusUseCase(repo);

    const result = await useCase.execute({
      appointmentId: 'appt-uuid-1',
      status: 'NO_SHOW',
      performedBy: 'admin-uuid',
    });

    expect(result.status).toBe('NO_SHOW');
  });

  it('should populate context.appointment after update', async () => {
    const repo = buildRepo();
    const useCase = new UpdateAppointmentStatusUseCase(repo);
    const context = {};

    await useCase.execute({
      appointmentId: 'appt-uuid-1',
      status: 'CANCELLED',
      performedBy: 'admin-uuid',
    }, context);

    expect(context.appointment).toBeDefined();
  });

  it('should throw NotFoundError when appointment does not exist', async () => {
    const repo = buildRepo({ findById: jest.fn().mockResolvedValue(null) });
    const useCase = new UpdateAppointmentStatusUseCase(repo);

    await expect(
      useCase.execute({ appointmentId: 'missing', status: 'CANCELLED', performedBy: 'admin' })
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'NOT_FOUND' });

    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  it('should throw ValidationError for invalid status value', async () => {
    const repo = buildRepo();
    const useCase = new UpdateAppointmentStatusUseCase(repo);

    await expect(
      useCase.execute({ appointmentId: 'appt-uuid-1', status: 'SUSPENDED', performedBy: 'admin' })
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'VALIDATION_ERROR' });

    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  it('should throw ValidationError when transitioning from a final status', async () => {
    const repo = buildRepo({
      findById: jest.fn().mockResolvedValue({ ...SCHEDULED_APPT, status: 'CANCELLED' }),
    });
    const useCase = new UpdateAppointmentStatusUseCase(repo);

    await expect(
      useCase.execute({ appointmentId: 'appt-uuid-1', status: 'COMPLETED', performedBy: 'admin' })
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'VALIDATION_ERROR' });
  });
});