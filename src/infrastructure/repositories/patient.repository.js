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
      include: {
        appointments: {
          orderBy: { date: 'desc' },
          include: {
            doctors: {
              select: { id: true, name: true, specialization: true },
            },
            appointment_history: {
              orderBy: { created_at: 'asc' },
            },
          },
        },
        medical_records: {
          orderBy: { created_at: 'desc' },
          include: {
            users: {
              select: { id: true, email: true },
            },
            risk_classifications: true,
          },
        },
        treatments: {
          orderBy: { created_at: 'desc' },
          include: {
            doctors: {
              select: { id: true, name: true, specialization: true },
            },
            medication_changes: {
              orderBy: { created_at: 'asc' },
              include: {
                users: { select: { id: true, email: true } },
              },
            },
            treatment_approvals: {
              orderBy: { approved_at: 'desc' },
              include: {
                users: { select: { id: true, email: true } },
              },
            },
          },
        },
      },
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

  async create({ name, documentNumber, birthDate, phone, email, diseaseCount, riskLevel }) {
    return prisma.patients.create({
      data: {
        name,
        document_number: documentNumber,
        birth_date: birthDate ? new Date(birthDate) : null,
        phone: phone ?? null,
        email: email ?? null,
        disease_count: diseaseCount,
        risk_level: riskLevel,
        is_active: true,
      },
    });
  }

  async update(id, { name, birthDate, phone, email, diseaseCount, riskLevel }) {
    return prisma.patients.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(birthDate !== undefined && { birth_date: birthDate ? new Date(birthDate) : null }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(diseaseCount !== undefined && { disease_count: diseaseCount }),
        ...(riskLevel !== undefined && { risk_level: riskLevel }),
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