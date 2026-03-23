import { jest } from '@jest/globals';
import TogglePatientStatusUseCase from '../src/application/use-cases/patient/togglePatientstatus.usecase';

function buildRepo(overrides = {}) {
  return {
    findById: jest.fn().mockResolvedValue({
      id: 'patient-1',
      name: 'María García',
      document_number: '1234567890',
      is_active: true,
      updated_at: new Date(),
    }),
    updateStatus: jest.fn().mockResolvedValue({
      id: 'patient-1',
      name: 'María García',
      document_number: '1234567890',
      is_active: false,
      updated_at: new Date(),
    }),
    ...overrides,
  };
}

describe('TogglePatientStatusUseCase', () => {
  it('should inactivate an active patient', async () => {
    const repo = buildRepo();
    const useCase = new TogglePatientStatusUseCase(repo);

    const result = await useCase.execute({ patientId: 'patient-1', status: 'INACTIVE' });

    expect(repo.updateStatus).toHaveBeenCalledWith('patient-1', false);
    expect(result.isActive).toBe(false);
  });

  it('should activate an inactive patient', async () => {
    const repo = buildRepo({
      findById: jest.fn().mockResolvedValue({ id: 'patient-2', name: 'Pedro', document_number: '111', is_active: false }),
      updateStatus: jest.fn().mockResolvedValue({ id: 'patient-2', name: 'Pedro', document_number: '111', is_active: true, updated_at: new Date() }),
    });
    const useCase = new TogglePatientStatusUseCase(repo);

    const result = await useCase.execute({ patientId: 'patient-2', status: 'ACTIVE' });

    expect(repo.updateStatus).toHaveBeenCalledWith('patient-2', true);
    expect(result.isActive).toBe(true);
  });

  it('should throw NotFoundError when patient does not exist', async () => {
    const repo = buildRepo({ findById: jest.fn().mockResolvedValue(null) });
    const useCase = new TogglePatientStatusUseCase(repo);

    await expect(
      useCase.execute({ patientId: 'missing', status: 'INACTIVE' })
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'NOT_FOUND' });
  });

  it('should throw ValidationError for invalid status value', async () => {
    const repo = buildRepo();
    const useCase = new TogglePatientStatusUseCase(repo);

    await expect(
      useCase.execute({ patientId: 'patient-1', status: 'SUSPENDED' })
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'VALIDATION_ERROR' });

    expect(repo.findById).not.toHaveBeenCalled();
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  it('should NOT delete patient history when inactivating', async () => {
    const repo = buildRepo();
    const useCase = new TogglePatientStatusUseCase(repo);

    await useCase.execute({ patientId: 'patient-1', status: 'INACTIVE' });

    // updateStatus only changes is_active flag, never deletes rows
    expect(repo.updateStatus).toHaveBeenCalledTimes(1);
    expect(repo.updateStatus).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ delete: expect.anything() })
    );
  });
});