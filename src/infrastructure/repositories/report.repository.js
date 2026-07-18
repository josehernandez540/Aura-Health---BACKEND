import prisma from '../../config/database.js';

class ReportRepository {
  async create(data) {
    return prisma.reports.create({
      data,
    });
  }
}

export default ReportRepository;