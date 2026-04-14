import { jest } from '@jest/globals';
import CreateAdminUserUseCase from '../src/application/use-cases/adminUser/createAdminUser.usecase.js';

function buildMocks({ existingEmail = null } = {}) {
  const adminUserRepository = {
    findByEmail: jest.fn().mockResolvedValue(existingEmail),
    create: jest.fn().mockResolvedValue({
      id: 'admin-uuid-1',
      email: 'nuevo.admin@aura.com',
      name: 'Carlos Admin',
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  };

  const emailService = {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  };

  return { adminUserRepository, emailService };
}

const VALID_INPUT = {
  email: 'nuevo.admin@aura.com',
  name: 'Carlos Admin',
};

describe('CreateAdminUserUseCase', () => {
  it('should create an admin user and return data', async () => {
    const { adminUserRepository, emailService } = buildMocks();
    const useCase = new CreateAdminUserUseCase(adminUserRepository, emailService);

    const result = await useCase.execute(VALID_INPUT);

    expect(result.email).toBe('nuevo.admin@aura.com');
    expect(result.role).toBe('ADMIN');
    expect(result.isActive).toBe(true);
    expect(adminUserRepository.create).toHaveBeenCalledTimes(1);
  });

  it('should hash the password before saving', async () => {
    const { adminUserRepository, emailService } = buildMocks();
    const useCase = new CreateAdminUserUseCase(adminUserRepository, emailService);

    await useCase.execute(VALID_INPUT);

    const { password } = adminUserRepository.create.mock.calls[0][0];
    expect(password).toMatch(/^\$2b\$/);
  });

  it('should call sendWelcomeEmail with correct recipient', async () => {
    const { adminUserRepository, emailService } = buildMocks();
    const useCase = new CreateAdminUserUseCase(adminUserRepository, emailService);

    await useCase.execute(VALID_INPUT);

    expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: VALID_INPUT.email })
    );
  });

  it('should throw ConflictError when email already exists', async () => {
    const { adminUserRepository, emailService } = buildMocks({
      existingEmail: { id: 'existing-id', email: VALID_INPUT.email },
    });
    const useCase = new CreateAdminUserUseCase(adminUserRepository, emailService);

    await expect(useCase.execute(VALID_INPUT)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'CONFLICT_ERROR',
    });

    expect(adminUserRepository.create).not.toHaveBeenCalled();
  });

  it('should populate context with created user for audit', async () => {
    const { adminUserRepository, emailService } = buildMocks();
    const useCase = new CreateAdminUserUseCase(adminUserRepository, emailService);
    const context = {};

    await useCase.execute(VALID_INPUT, context);

    expect(context.user).toBeDefined();
    expect(context.user.id).toBe('admin-uuid-1');
  });

  it('should still return success even if email sending fails', async () => {
    const { adminUserRepository, emailService } = buildMocks();
    emailService.sendWelcomeEmail = jest.fn().mockRejectedValue(new Error('SMTP error'));
    const useCase = new CreateAdminUserUseCase(adminUserRepository, emailService);

    const result = await useCase.execute(VALID_INPUT);

    expect(result.email).toBe('nuevo.admin@aura.com');
  });
});