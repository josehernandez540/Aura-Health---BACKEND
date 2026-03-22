class AuditService {
  constructor(auditRepository) {
    this.auditRepository = auditRepository;
  }

  async log({
    userId,
    action,
    entityType,
    entityId,
    metadata,
    severity = 'INFO'
  }) {
    await this.auditRepository.create({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
      severity
    });
  }
}

export default AuditService;