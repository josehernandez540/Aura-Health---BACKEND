import { jest } from '@jest/globals';
import ToggleAdminStatusUseCase from '../src/application/use-cases/adminUser/toggleAdminStatus.usecase.js';

const ACTIVE_ADMIN = {
  id: 'admin-uuid-1',
  email: 'admin@aura.com',
  name: 'Admin Uno',
  role: 'ADMIN',
  isActive: true,
};

function buildRepo(overrides = {}) {
  return {
    findById: jest.fn().mockResolvedValue(ACTIVE_ADMIN),
    updateStatus: jest.fn().mockImplementation(async (id, isActive) => ({
      ...ACTIVE_ADMIN,
      isActive,
      updatedAt: new Date(),
    })),
    countActiveAdmins: jest.fn().mockResolvedValue(2),
    ...overrides,
  };
}

describe('ToggleAdminStatusUseCase', () => {
  it('should inactivate an active admin', async () => {
    const repo = buildRepo();
    const useCase = new ToggleAdminStatusUseCase(repo);

    const result = await useCase.execute({
      adminId: 'admin-uuid-1',
      status: 'INACTIVE',
      requestingUserId: 'otro-admin-uuid',
    });

    expect(repo.updateStatus).toHaveBeenCalledWith('admin-uuid-1', false);
    expect(result.isActive).toBe(false);
  });

  it('should activate an inactive admin', async () => {
    const repo = buildRepo({
      findById: jest.fn().mockResolvedValue({ ...ACTIVE_ADMIN, isActive: false }),
      updateStatus: jest.fn().mockResolvedValue({ ...ACTIVE_ADMIN, isActive: true, updatedAt: new Date() }),
    });
    const useCase = new ToggleAdminStatusUseCase(repo);

    const result = await useCase.execute({
      adminId: 'admin-uuid-1',
      status: 'ACTIVE',
      requestingUserId: 'otro-admin-uuid',
    });

    expect(result.isActive).toBe(true);
  });

  it('should throw NotFoundError if admin does not exist', async () => {
    const repo = buildRepo({ findById: jest.fn().mockResolvedValue(null) });
    const useCase = new ToggleAdminStatusUseCase(repo);

    await expect(
      useCase.execute({ adminId: 'missing', status: 'INACTIVE', requestingUserId: 'otro' })
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'NOT_FOUND' });
  });

  it('should throw ValidationError for invalid status', async () => {
    const repo = buildRepo();
    const useCase = new ToggleAdminStatusUseCase(repo);

    await expect(
      useCase.execute({ adminId: 'admin-uuid-1', status: 'SUSPENDED', requestingUserId: 'otro' })
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'VALIDATION_ERROR' });
  });

  it('should throw ValidationError if admin tries to deactivate themselves', async () => {
    const repo = buildRepo();
    const useCase = new ToggleAdminStatusUseCase(repo);

    await expect(
      useCase.execute({
        adminId: 'admin-uuid-1',
        status: 'INACTIVE',
        requestingUserId: 'admin-uuid-1', // mismo ID
      })
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'VALIDATION_ERROR' });
  });

  it('should throw ValidationError when deactivating the last active admin', async () => {
    const repo = buildRepo({ countActiveAdmins: jest.fn().mockResolvedValue(1) });
    const useCase = new ToggleAdminStatusUseCase(repo);

    await expect(
      useCase.execute({
        adminId: 'admin-uuid-1',
        status: 'INACTIVE',
        requestingUserId: 'otro-admin-uuid',
      })
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'VALIDATION_ERROR' });
  });

  it('should populate context.user after update', async () => {
    const repo = buildRepo();
    const useCase = new ToggleAdminStatusUseCase(repo);
    const context = {};

    await useCase.execute({
      adminId: 'admin-uuid-1',
      status: 'INACTIVE',
      requestingUserId: 'otro-admin-uuid',
    }, context);

    expect(context.user).toBeDefined();
  });
});