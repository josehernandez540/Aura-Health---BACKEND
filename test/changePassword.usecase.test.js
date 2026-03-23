import bcrypt from 'bcryptjs';
import { jest } from '@jest/globals';
import ChangePasswordUseCase from '../src/application/use-cases/auth/changePassword.usecase';
async function buildMocks({ userOverride = {} } = {}) {
  const hashedPassword = await bcrypt.hash('Aura1234!', 10);

  const userRepository = {
    findById: jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'doctor@aura.com',
      password: hashedPassword,
      roles: { name: 'DOCTOR' },
      must_change_password: true,
      ...userOverride,
    }),
    updatePassword: jest.fn().mockResolvedValue(undefined),
  };

  const jwtService = {
    generateToken: jest.fn().mockReturnValue('new-token-abc'),
  };

  return { userRepository, jwtService };
}

describe('ChangePasswordUseCase', () => {
  it('should change password and return a new JWT token', async () => {
    const { userRepository, jwtService } = await buildMocks();
    const useCase = new ChangePasswordUseCase(userRepository, jwtService);

    const result = await useCase.execute({
      userId: 'user-1',
      currentPassword: 'Aura1234!',
      newPassword: 'NuevaClave99',
    });

    expect(result.token).toBe('new-token-abc');
    expect(userRepository.updatePassword).toHaveBeenCalledWith('user-1', expect.stringMatching(/^\$2b\$/));
    expect(jwtService.generateToken).toHaveBeenCalledWith(
      expect.objectContaining({ mustChangePassword: false })
    );
  });

  it('should throw AuthenticationError if current password is wrong', async () => {
    const { userRepository, jwtService } = await buildMocks();
    const useCase = new ChangePasswordUseCase(userRepository, jwtService);

    await expect(
      useCase.execute({
        userId: 'user-1',
        currentPassword: 'WrongPassword!',
        newPassword: 'NuevaClave99',
      })
    ).rejects.toMatchObject({ statusCode: 401, errorCode: 'AUTHENTICATION_ERROR' });

    expect(userRepository.updatePassword).not.toHaveBeenCalled();
  });

  it('should throw ValidationError if new password is same as current', async () => {
    const { userRepository, jwtService } = await buildMocks();
    const useCase = new ChangePasswordUseCase(userRepository, jwtService);

    await expect(
      useCase.execute({
        userId: 'user-1',
        currentPassword: 'Aura1234!',
        newPassword: 'Aura1234!',
      })
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'VALIDATION_ERROR' });
  });

  it('should throw ValidationError if new password is too short', async () => {
    const { userRepository, jwtService } = await buildMocks();
    const useCase = new ChangePasswordUseCase(userRepository, jwtService);

    await expect(
      useCase.execute({
        userId: 'user-1',
        currentPassword: 'Aura1234!',
        newPassword: 'Corta1',
      })
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'VALIDATION_ERROR' });
  });

  it('should throw AuthenticationError if user does not exist', async () => {
    const { jwtService } = await buildMocks();
    const userRepository = {
      findById: jest.fn().mockResolvedValue(null),
      updatePassword: jest.fn(),
    };
    const useCase = new ChangePasswordUseCase(userRepository, jwtService);

    await expect(
      useCase.execute({
        userId: 'nonexistent',
        currentPassword: 'any',
        newPassword: 'NuevaClave99',
      })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('should hash the new password before saving', async () => {
    const { userRepository, jwtService } = await buildMocks();
    const useCase = new ChangePasswordUseCase(userRepository, jwtService);

    await useCase.execute({
      userId: 'user-1',
      currentPassword: 'Aura1234!',
      newPassword: 'NuevaClave99',
    });

    const savedHash = userRepository.updatePassword.mock.calls[0][1];
    expect(savedHash).toMatch(/^\$2b\$/);
    expect(savedHash).not.toBe('NuevaClave99');
  });
});