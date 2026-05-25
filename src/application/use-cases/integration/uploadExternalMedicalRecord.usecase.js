import crypto from 'crypto';
import fs from 'fs';
import { NotFoundError, ValidationError } from '../../../shared/errors/errors.js';

class UploadExternalMedicalRecordUseCase {
  constructor(patientRepository, medicalRecordRepository) {
    this.patientRepository = patientRepository;
    this.medicalRecordRepository = medicalRecordRepository;
  }

  async execute({ patientId, file }) {

    if (!file) {
      throw new ValidationError('Archivo PDF requerido');
    }

    const patient = await this.patientRepository.findById(patientId);

    if (!patient) {
      throw new NotFoundError('Paciente no encontrado');
    }

    const fileBuffer = fs.readFileSync(file.path);

    const fileHash = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex');

    const medicalRecord = await this.medicalRecordRepository.create({
      patientId,
      fileUrl: file.path,
      fileHash,
      source: 'EXTERNAL',
    });

    return {
      id: medicalRecord.id,
      patientId: medicalRecord.patient_id,
      source: medicalRecord.source,
      fileUrl: `/medical-records/${medicalRecord.id}/download`,
      createdAt: medicalRecord.created_at,
    };
  }
}

export default UploadExternalMedicalRecordUseCase;