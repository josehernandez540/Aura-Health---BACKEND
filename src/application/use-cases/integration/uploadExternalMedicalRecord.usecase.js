import crypto from 'crypto';
import fs from 'fs';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../../../shared/errors/errors.js';

class UploadExternalMedicalRecordUseCase {
  constructor(
    patientRepository,
    medicalRecordRepository,
    riskClassificationService
  ) {
    this.patientRepository = patientRepository;
    this.medicalRecordRepository = medicalRecordRepository;
    this.riskClassificationService = riskClassificationService;
  }

  async execute({ patientId, patientData, file }) {

    if (!file) {
      throw new ValidationError('Archivo PDF requerido');
    }

    let patient = null;

    if (patientId) {
      patient = await this.patientRepository.findById(patientId);

      if (!patient) {
        throw new NotFoundError('Paciente no encontrado');
      }
    } else {
      if (!patientData?.documentNumber) {
        throw new ValidationError(
          'documentNumber es requerido si no se envía patientId'
        );
      }

      patient = await this.patientRepository.findByDocumentNumber(
        patientData.documentNumber
      );

      if (!patient) {

        const diseaseCount = Number(patientData.diseaseCount ?? 0);

        const riskLevel = this.riskClassificationService.calculate(diseaseCount);

        patient = await this.patientRepository.create({
          name: patientData.name,
          documentNumber: patientData.documentNumber,
          birthDate: patientData.birthDate,
          phone: patientData.phone,
          email: patientData.email,
          diseaseCount,
          riskLevel,
        });
      }
      else {
        const diseaseCount = Number(patientData.diseaseCount ?? patient.disease_count ?? 0);

        const riskLevel = this.riskClassificationService.calculate(diseaseCount);

        patient = await this.patientRepository.update(patient.id, {
          diseaseCount,
          riskLevel,
        });
      }
    }

    const fileBuffer = fs.readFileSync(file.path);

    const fileHash = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex');

    const medicalRecord =
      await this.medicalRecordRepository.create({
        patientId: patient.id,
        fileUrl: file.path,
        fileHash,
        source: 'EXTERNAL',
      });

    return {
      id: medicalRecord.id,
      patient: {
        id: patient.id,
        name: patient.name,
        documentNumber: patient.document_number,
        diseaseCount: patient.disease_count,
        riskLevel: patient.risk_level,
      },
      source: medicalRecord.source,
      fileUrl: `/medical-records/${medicalRecord.id}/download`,
      createdAt: medicalRecord.created_at,
    };
  }
}

export default UploadExternalMedicalRecordUseCase;