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

  async findByIdWithDetails(id) {
    return prisma.doctors.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            is_active: true,
            must_change_password: true,
            created_at: true,
            roles: { select: { name: true } },
          },
        },
        appointments: {
          orderBy: { date: 'desc' },
          include: {
            patients: {
              select: {
                id: true,
                name: true,
                document_number: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        treatments: {
          orderBy: { created_at: 'desc' },
          include: {
            patients: {
              select: {
                id: true,
                name: true,
                document_number: true,
              },
            },
          },
        },
      },
    });
  }

  async update(id, data) {
  return prisma.doctors.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.specialization !== undefined && { specialization: data.specialization }),
      ...(data.licenseNumber !== undefined && { license_number: data.licenseNumber })
    },
  });
}
}

export default PrismaDoctorRepository;