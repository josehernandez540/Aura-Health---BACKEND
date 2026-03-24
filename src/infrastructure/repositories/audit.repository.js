import prisma from '../../config/database.js';

class AuditRepository {
  async create(data) {
    return prisma.audit_logs.create({ data });
  }

  async findAll({
    page = 1,
    limit = 20,
    userId,
    action,
    entityType,
    entityId,
    severity,
    startDate,
    endDate,
  } = {}) {
    const skip = (page - 1) * limit;

    const where = {
      ...(userId && { user_id: userId }),
      ...(action && { action: { contains: action, mode: 'insensitive' } }),
      ...(entityType && { entity_type: entityType }),
      ...(entityId && { entity_id: entityId }),
      ...(severity && { severity }),
      ...((startDate || endDate) && {
        created_at: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    };

    const [items, total] = await Promise.all([
      prisma.audit_logs.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          users: {
            select: { id: true, email: true, roles: { select: { name: true } } },
          },
        },
      }),
      prisma.audit_logs.count({ where }),
    ]);

    return {
      items: items.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        metadata: log.metadata,
        severity: log.severity,
        createdAt: log.created_at,
        user: log.users
          ? {
            id: log.users.id,
            email: log.users.email,
            role: log.users.roles?.name ?? null,
          }
          : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export default AuditRepository;