import DoctorRepository from '../../domain/repositories/doctor.repository.js';
import prisma from '../../config/database.js';

class PrismaDoctorRepository extends DoctorRepository {
  async findByDocumentNumber(documentNumber) {
    return prisma.patients.findUnique({
      where: { document_number: documentNumber },
    });
  }

  async findById(id) {
    return prisma.doctors.findUnique({
      where: { id },
      include: { users: { include: { roles: true } } },
    });
  }

  async findAll({ page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.doctors.findMany({
        where: { is_active: true },
        skip,
        take: limit,
        include: { users: { select: { email: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.doctors.count({ where: { is_active: true } }),
    ]);
    return { items, total, page, limit };
  }

  async updateStatus(doctorId, status, performedBy) {
    const isActive = status === 'ACTIVE';

    return prisma.$transaction(async (tx) => {
      const doctor = await tx.doctors.update({
        where: { id: doctorId },
        data: {
          is_active: isActive,
          status_changed_by: performedBy,
          status_changed_at: new Date(),
        },
      });

      await tx.users.update({
        where: { id: doctor.user_id },
        data: { is_active: isActive },
      });

      return doctor;
    });
  }
}

export default PrismaDoctorRepository;