import bcrypt from 'bcryptjs';
import LoginUseCase from '../src/application/use-cases/auth/login.usecase';
import { jest } from '@jest/globals';

describe('LoginUseCase', () => {

  it('should login successfully', async () => {
    const mockUserRepo = {
      findByEmail: jest.fn().mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        password: await bcrypt.hash('123456', 10),
        roles: { name: 'ADMIN' }
      })
    };

    const mockJwt = {
      generateToken: jest.fn().mockReturnValue('token123')
    };

    const useCase = new LoginUseCase(mockUserRepo, mockJwt);

    const result = await useCase.execute({
      email: 'test@test.com',
      password: '123456'
    });

    expect(result.token).toBe('token123');
  });

  it('should throw if user not found', async () => {
    const mockUserRepo = {
      findByEmail: jest.fn().mockResolvedValue(null)
    };

    const useCase = new LoginUseCase(mockUserRepo, {});

    await expect(
      useCase.execute({ email: 'x', password: '123' })
    ).rejects.toThrow();
  });

  it('should throw if password is wrong', async () => {
    const mockUserRepo = {
      findByEmail: jest.fn().mockResolvedValue({
        id: '1',
        password: await bcrypt.hash('correct', 10),
        roles: { name: 'ADMIN' }
      })
    };

    const useCase = new LoginUseCase(mockUserRepo, {});

    await expect(
      useCase.execute({ email: 'x', password: 'wrong' })
    ).rejects.toThrow();
  });

});