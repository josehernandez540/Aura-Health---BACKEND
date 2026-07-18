import fs from 'fs';
import AuditService from '../../application/services/audit.service.js';
import AuditRepository from '../../infrastructure/repositories/audit.repository.js';
import PrismaMedicalRecordRepository from '../../infrastructure/repositories/medicalRecord.repository.js';
import PrismaPatientRepository from '../../infrastructure/repositories/patient.repository.js';
import { withAudit } from '../../shared/utils/audit-wrapper.js';
import { AuditActions } from '../../domain/constants/audit-actions.js';
import { successResponse } from '../../shared/utils/apiResponse.js';
import { NotFoundError } from '../../shared/errors/errors.js';
import UploadMedicalRecordUseCase from '../../application/use-cases/medicalRecord/uploadMedicalRecord.usecase.js';
import ValidateMedicalRecordUseCase from '../../application/use-cases/medicalRecord/validateMedicalRecord.usecase.js';

const medicalRecordRepository = new PrismaMedicalRecordRepository();
const patientRepository = new PrismaPatientRepository();
const auditRepository = new AuditRepository();
const auditService = new AuditService(auditRepository);

const uploadRaw = new UploadMedicalRecordUseCase(medicalRecordRepository, patientRepository);
const validateRaw = new ValidateMedicalRecordUseCase(medicalRecordRepository);

const uploadUseCase = {
  execute: withAudit(uploadRaw.execute.bind(uploadRaw), auditService, {
    action: AuditActions.MEDICAL_RECORD_UPLOADED,
    entityType: 'MEDICAL_RECORD',
    getUserId: (_r, params) => params.uploadedBy ?? null,
    getEntityId: (result) => result?.id ?? null,
    getMetadata: (params) => ({
      patientId: params.patientId,
      documentType: params.documentType,
    }),
  }),
};

const validateUseCase = {
  execute: withAudit(validateRaw.execute.bind(validateRaw), auditService, {
    action: AuditActions.MEDICAL_RECORD_VALIDATED,
    entityType: 'MEDICAL_RECORD',
    getUserId: (_r, params) => params.validatedBy ?? null,
    getEntityId: (_r, params) => params.recordId,
    getMetadata: () => ({}),
  }),
};

class MedicalRecordController {
  async upload(req, res, next) {
    try {
      const { patientId, documentType } = req.body;

      const record = await uploadUseCase.execute({
        patientId,
        documentType,
        file: req.file,
        uploadedBy: req.user.userId,
      });

      return successResponse(res, record, 'Documento subido correctamente');
    } catch (error) {
      next(error);
    }
  }

  async findAll(req, res, next) {
    try {
      const { page = 1, limit = 20, search, documentType } = req.query;

      const result = await medicalRecordRepository.findAll({
        page: Number(page),
        limit: Math.min(Number(limit), 100),
        search,
        documentType,
      });

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async validate(req, res, next) {
    try {
      const { id } = req.params;

      const record = await validateUseCase.execute({
        recordId: id,
        validatedBy: req.user.userId,
      });

      return successResponse(res, record, 'Registro validado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async download(req, res, next) {
    try {
      const { id } = req.params;

      const medicalRecord = await medicalRecordRepository.findById(id);

      if (!medicalRecord) {
        throw new NotFoundError('Archivo no encontrado');
      }

      const filePath = medicalRecord.file_url;

      if (!fs.existsSync(filePath)) {
        throw new NotFoundError('Archivo físico no encontrado');
      }

      res.setHeader('Content-Type', 'application/pdf');

      const stream = fs.createReadStream(filePath);

      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
}

export default new MedicalRecordController();
