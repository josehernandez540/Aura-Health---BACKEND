import prisma from '../../config/database.js';
import MedicalRecordRepository from '../../domain/repositories/medicalRecord.repository.js';

class PrismaMedicalRecordRepository extends MedicalRecordRepository {
  async create({ patientId, uploadedBy = null, fileUrl, fileHash, source }) {
    return prisma.medical_records.create({
      data: {
        patient_id: patientId,
        uploaded_by: uploadedBy,
        file_url: fileUrl,
        file_hash: fileHash,
        source,
      },
    });
  }

  async findById(id) {
    return prisma.medical_records.findUnique({
      where: { id },
    });
  }
}

export default PrismaMedicalRecordRepository;