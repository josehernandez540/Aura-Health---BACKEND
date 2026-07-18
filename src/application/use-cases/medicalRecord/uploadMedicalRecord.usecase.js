import crypto from 'crypto';
import fs from 'fs';
import { NotFoundError, ValidationError } from '../../../shared/errors/errors.js';

class UploadMedicalRecordUseCase {
  constructor(medicalRecordRepository, patientRepository) {
    this.medicalRecordRepository = medicalRecordRepository;
    this.patientRepository = patientRepository;
  }

  async execute({ patientId, documentType, file, uploadedBy }) {
    if (!file) {
      throw new ValidationError('Archivo PDF requerido');
    }

    const patient = await this.patientRepository.findById(patientId);

    if (!patient) {
      throw new NotFoundError('Paciente no encontrado');
    }

    const fileBuffer = fs.readFileSync(file.path);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const created = await this.medicalRecordRepository.create({
      patientId,
      uploadedBy,
      fileUrl: file.path,
      fileName: file.originalname,
      fileHash,
      source: 'INTERNAL',
      documentType,
    });

    return this.medicalRecordRepository.findByIdDetailed(created.id);
  }
}

export default UploadMedicalRecordUseCase;
