import ToggleDoctorStatusUseCase from '../src/application/use-cases/doctors/toggleDoctorStatus.usecase.js';
import { jest } from '@jest/globals';

const makeRepo = (overrides = {}) => ({
  findById: jest.fn(),
  updateStatus: jest.fn(),
  ...overrides,
});

describe('ToggleDoctorStatusUseCase', () => {

  it('should inactivate an active doctor', async () => {
    const doctor = { id: 'doc-1', name: 'Dr. House', is_active: true, status_changed_at: new Date(), user_id: 'usr-1' };
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(doctor),
      updateStatus: jest.fn().mockResolvedValue({ ...doctor, is_active: false }),
    });

    const useCase = new ToggleDoctorStatusUseCase(repo);
    const result = await useCase.execute({ doctorId: 'doc-1', status: 'INACTIVE', performedBy: 'admin-1' });

    expect(repo.updateStatus).toHaveBeenCalledWith('doc-1', 'INACTIVE', 'admin-1');
    expect(result.is_active).toBe(false);
  });

  it('should activate an inactive doctor', async () => {
    const doctor = { id: 'doc-2', name: 'Dr. Strange', is_active: false, status_changed_at: new Date(), user_id: 'usr-2' };
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(doctor),
      updateStatus: jest.fn().mockResolvedValue({ ...doctor, is_active: true }),
    });

    const useCase = new ToggleDoctorStatusUseCase(repo);
    const result = await useCase.execute({ doctorId: 'doc-2', status: 'ACTIVE', performedBy: 'admin-1' });

    expect(result.is_active).toBe(true);
  });

  it('should throw NotFoundError if doctor does not exist', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });

    const useCase = new ToggleDoctorStatusUseCase(repo);

    await expect(
      useCase.execute({ doctorId: 'missing', status: 'INACTIVE', performedBy: 'admin-1' })
    ).rejects.toThrow('no encontrado');
  });

  it('should throw AuthorizationError for invalid status value', async () => {
    const repo = makeRepo({ findById: jest.fn() });

    const useCase = new ToggleDoctorStatusUseCase(repo);

    await expect(
      useCase.execute({ doctorId: 'doc-1', status: 'SUSPENDED', performedBy: 'admin-1' })
    ).rejects.toThrow('Estado inválido');
  });

});