import prisma from '../../config/database.js';
import PatientRepository from '../../domain/repositories/patient.repository.js';

class PrismaPatientRepository extends PatientRepository {
  async findByDocumentNumber(documentNumber) {
    return prisma.patients.findUnique({
      where: { document_number: documentNumber },
    });
  }

  async findById(id) {
    return prisma.patients.findUnique({
      where: { id },
    });
  }

  async findAll({ page = 1, limit = 20, search = '', onlyActive = false } = {}) {
    const skip = (page - 1) * limit;

    const where = {
      ...(onlyActive && { is_active: true }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { document_number: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.patients.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          document_number: true,
          birth_date: true,
          phone: true,
          email: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
      }),
      prisma.patients.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create({ name, documentNumber, birthDate, phone, email }) {
    return prisma.patients.create({
      data: {
        name,
        document_number: documentNumber,
        birth_date: birthDate ? new Date(birthDate) : null,
        phone: phone ?? null,
        email: email ?? null,
        is_active: true,
      },
    });
  }

  async update(id, { name, birthDate, phone, email }) {
    return prisma.patients.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(birthDate !== undefined && { birth_date: birthDate ? new Date(birthDate) : null }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        updated_at: new Date(),
      },
    });
  }

  async updateStatus(id, isActive) {
    return prisma.patients.update({
      where: { id },
      data: {
        is_active: isActive,
        updated_at: new Date(),
      },
    });
  }
}

export default PrismaPatientRepository;