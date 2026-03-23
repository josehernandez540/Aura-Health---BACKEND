import { jest } from '@jest/globals';
import UpdatePatientUseCase from '../src/application/use-cases/patient/updatePatient.usecase.js';

const EXISTING_PATIENT = {
  id: 'patient-1',
  name: 'María García',
  document_number: '1234567890',
  birth_date: new Date('1985-06-15'),
  phone: '+57 300 1234567',
  email: 'maria@example.com',
  is_active: true,
  updated_at: new Date(),
};

function buildRepo(overrides = {}) {
  return {
    findById: jest.fn().mockResolvedValue(EXISTING_PATIENT),
    update: jest.fn().mockResolvedValue({ ...EXISTING_PATIENT, name: 'María García Ruiz', updated_at: new Date() }),
    ...overrides,
  };
}

describe('UpdatePatientUseCase', () => {
  it('should update patient name and return updated data', async () => {
    const repo = buildRepo();
    const useCase = new UpdatePatientUseCase(repo);

    const result = await useCase.execute({ patientId: 'patient-1', name: 'María García Ruiz' });

    expect(result.name).toBe('María García Ruiz');
    expect(repo.update).toHaveBeenCalledWith(
      'patient-1',
      expect.objectContaining({ name: 'María García Ruiz' })
    );
  });

  it('should throw NotFoundError when patient does not exist', async () => {
    const repo = buildRepo({ findById: jest.fn().mockResolvedValue(null) });
    const useCase = new UpdatePatientUseCase(repo);

    await expect(
      useCase.execute({ patientId: 'nonexistent', name: 'Test' })
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'NOT_FOUND' });

    expect(repo.update).not.toHaveBeenCalled();
  });

  it('should populate context.patient after update', async () => {
    const repo = buildRepo();
    const useCase = new UpdatePatientUseCase(repo);
    const context = {};

    await useCase.execute({ patientId: 'patient-1', phone: '+57 310 9999999' }, context);

    expect(context.patient).toBeDefined();
  });

  it('should allow updating only phone', async () => {
    const repo = buildRepo({
      update: jest.fn().mockResolvedValue({ ...EXISTING_PATIENT, phone: '+57 310 9999999' }),
    });
    const useCase = new UpdatePatientUseCase(repo);

    const result = await useCase.execute({ patientId: 'patient-1', phone: '+57 310 9999999' });

    expect(repo.update).toHaveBeenCalledWith(
      'patient-1',
      expect.objectContaining({ phone: '+57 310 9999999' })
    );
    expect(result).toBeDefined();
  });
});