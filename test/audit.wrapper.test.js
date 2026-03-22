import { withAudit } from "../src/shared/utils/audit-wrapper";
import { jest } from '@jest/globals';

describe('withAudit', () => {

  it('should call useCase and audit', async () => {
    const mockUseCase = jest.fn().mockResolvedValue({ id: '123' });

    const mockAudit = {
      log: jest.fn()
    };

    const wrapped = withAudit(mockUseCase, mockAudit, {
      action: 'TEST',
      entityType: 'USER',
      getUserId: (result, params) => params.userId,
      getEntityId: (result) => result?.id,
    });

    const result = await wrapped({ name: 'test', userId: '1' });

    expect(mockUseCase).toHaveBeenCalled();
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '1',
        action: 'TEST',
        entityType: 'USER',
        entityId: '123'
      })
    );
    expect(result.id).toBe('123');
  });

  it('should log failed action and rethrow on error', async () => {
    const mockUseCase = jest.fn().mockRejectedValue(new Error('algo falló'));

    const mockAudit = {
      log: jest.fn()
    };

    const wrapped = withAudit(mockUseCase, mockAudit, {
      action: 'TEST',
      entityType: 'USER',
      getUserId: (result, params) => params.userId,
      getEntityId: () => null,
    });

    await expect(wrapped({ userId: '1' })).rejects.toThrow('algo falló');

    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TEST_FAILED',
        entityType: 'USER',
      })
    );
  });

});