import AuditService from "../src/application/services/audit.service";
import { jest } from '@jest/globals';

describe('AuditService', () => {

  it('should call repository with correct data', async () => {
    const mockRepo = {
      create: jest.fn()
    };

    const service = new AuditService(mockRepo);

    await service.log({
      userId: '123',
      action: 'TEST_ACTION'
    });

    expect(mockRepo.create).toHaveBeenCalledWith({
      user_id: '123',
      action: 'TEST_ACTION',
      entity_type: undefined,
      entity_id: undefined,
      metadata: undefined,
      severity: 'INFO'
    });
  });

});