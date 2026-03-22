import prisma from '../../config/database.js';

class AuditRepository {
  async create(data) {
    return prisma.audit_logs.create({ data });
  }
}

export default AuditRepository;