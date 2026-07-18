import prisma from '../../config/database.js';
import MedicalRecordRepository from '../../domain/repositories/medicalRecord.repository.js';

const includeRelations = {
  patients: { select: { id: true, name: true } },
  users: { select: { id: true, email: true, doctors: { select: { name: true } } } },
  validator: { select: { id: true, email: true } },
};

const mapRow = (row) => ({
  id: row.id,
  patientId: row.patient_id,
  patientName: row.patients?.name ?? null,
  fileUrl: row.file_url,
  fileName: row.file_name,
  fileHash: row.file_hash,
  source: row.source,
  documentType: row.document_type,
  uploadedBy: row.users
    ? { id: row.users.id, name: row.users.doctors?.name ?? row.users.email }
    : null,
  isValidated: !!row.validated_at,
  validatedAt: row.validated_at,
  validatedBy: row.validator ? { id: row.validator.id, email: row.validator.email } : null,
  createdAt: row.created_at,
});

class PrismaMedicalRecordRepository extends MedicalRecordRepository {
  async create({ patientId, uploadedBy = null, fileUrl, fileName, fileHash, source, documentType }) {
    // Note: returns the raw Prisma row (snake_case) — uploadExternalMedicalRecord.usecase.js
    // (external integration flow) depends on this exact shape. Use findByIdDetailed() for the
    // mapped/camelCase shape used by the internal upload endpoint.
    return prisma.medical_records.create({
      data: {
        patient_id: patientId,
        uploaded_by: uploadedBy,
        file_url: fileUrl,
        file_name: fileName,
        file_hash: fileHash,
        source,
        document_type: documentType,
      },
    });
  }

  async findById(id) {
    return prisma.medical_records.findUnique({
      where: { id },
    });
  }

  async findByIdDetailed(id) {
    const row = await prisma.medical_records.findUnique({
      where: { id },
      include: includeRelations,
    });

    return row ? mapRow(row) : null;
  }

  async findAll({ page = 1, limit = 20, search, documentType } = {}) {
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { patients: { name: { contains: search, mode: 'insensitive' } } },
          { users: { doctors: { name: { contains: search, mode: 'insensitive' } } } },
          { users: { email: { contains: search, mode: 'insensitive' } } },
        ],
      }),
      ...(documentType && { document_type: documentType }),
    };

    const [rows, total] = await Promise.all([
      prisma.medical_records.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: includeRelations,
      }),
      prisma.medical_records.count({ where }),
    ]);

    return {
      items: rows.map(mapRow),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async validate(id, validatedBy) {
    const row = await prisma.medical_records.update({
      where: { id },
      data: { validated_by: validatedBy, validated_at: new Date() },
      include: includeRelations,
    });

    return mapRow(row);
  }
}

export default PrismaMedicalRecordRepository;
