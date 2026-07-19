import prisma from '../../config/database.js';

class ReportRepository {
  async create(data) {
    return prisma.reports.create({
      data,
    });
  }

  async updateFileUrl(id, fileUrl) {
    return prisma.reports.update({
      where: { id },
      data: { file_url: fileUrl },
    });
  }

  async findById(id) {
    return prisma.reports.findUnique({
      where: { id },
    });
  }

  async findAll({ page = 1, limit = 20, type } = {}) {
    const skip = (page - 1) * limit;
    const where = { ...(type && { type }) };

    const [rows, total] = await Promise.all([
      prisma.reports.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          users: {
            select: {
              email: true,
              doctors: { select: { name: true } },
            },
          },
        },
      }),
      prisma.reports.count({ where }),
    ]);

    return {
      items: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async countStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [total, thisMonth, today] = await Promise.all([
      prisma.reports.count(),
      prisma.reports.count({ where: { created_at: { gte: startOfMonth } } }),
      prisma.reports.count({ where: { created_at: { gte: startOfDay } } }),
    ]);

    return { total, thisMonth, today };
  }
}

export default ReportRepository;
