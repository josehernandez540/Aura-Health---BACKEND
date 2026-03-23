import AuditService from '../../application/services/audit.service.js';
import CreatePatientUseCase from '../../application/use-cases/patient/createPatient.usecase.js';
import TogglePatientStatusUseCase from '../../application/use-cases/patient/togglePatientstatus.usecase.js';
import UpdatePatientUseCase from '../../application/use-cases/patient/updatePatient.usecase.js';
import AuditRepository from '../../infrastructure/repositories/audit.repository.js';
import PrismaPatientRepository from '../../infrastructure/repositories/patient.repository.js';
import { successResponse } from '../../shared/utils/apiResponse.js';
import { withAudit } from '../../shared/utils/audit-wrapper.js';

const patientRepository = new PrismaPatientRepository();
const auditRepository = new AuditRepository();
const auditService = new AuditService(auditRepository);

const createRaw = new CreatePatientUseCase(patientRepository);
const updateRaw = new UpdatePatientUseCase(patientRepository);
const toggleStatusRaw = new TogglePatientStatusUseCase(patientRepository);

const PATIENT_ACTIONS = {
  PATIENT_CREATED: 'PATIENT_CREATED',
  PATIENT_UPDATED: 'PATIENT_UPDATED',
  PATIENT_STATUS_CHANGED: 'PATIENT_STATUS_CHANGED',
};

const createUseCase = {
  execute: withAudit(createRaw.execute.bind(createRaw), auditService, {
    action: PATIENT_ACTIONS.PATIENT_CREATED,
    entityType: 'PATIENT',
    getUserId: (_r, _p, ctx) => ctx?.user?.userId,
    getEntityId: (_r, _p, ctx) => ctx?.patient?.id ?? null,
    getMetadata: (params) => ({
      name: params.name,
      documentNumber: params.documentNumber,
    }),
  }),
};

const updateUseCase = {
  execute: withAudit(updateRaw.execute.bind(updateRaw), auditService, {
    action: PATIENT_ACTIONS.PATIENT_UPDATED,
    entityType: 'PATIENT',
    getUserId: (_r, _p, ctx) => ctx?.user?.userId,
    getEntityId: (_r, params) => params.patientId,
    getMetadata: (params) => ({ patientId: params.patientId }),
  }),
};

const toggleStatusUseCase = {
  execute: withAudit(toggleStatusRaw.execute.bind(toggleStatusRaw), auditService, {
    action: PATIENT_ACTIONS.PATIENT_STATUS_CHANGED,
    entityType: 'PATIENT',
    getUserId: (_r, _p, ctx) => ctx?.user?.userId,
    getEntityId: (_r, params) => params.patientId,
    getMetadata: (params) => ({ newStatus: params.status }),
  }),
};

class PatientController {
  async create(req, res, next) {
    try {
      const result = await createUseCase.execute(req.body);
      return successResponse(res, result, 'Paciente creado exitosamente');
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id: patientId } = req.params;
      const result = await updateUseCase.execute({ patientId, ...req.body });
      return successResponse(res, result, 'Paciente actualizado exitosamente');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id: patientId } = req.params;
      const { status } = req.body;
      const result = await toggleStatusUseCase.execute({ patientId, status });
      const msg = status === 'ACTIVE' ? 'activado' : 'inactivado';
      return successResponse(res, result, `Paciente ${msg} correctamente`);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        onlyActive,
      } = req.query;

      const result = await patientRepository.findAll({
        page: Number(page),
        limit: Math.min(Number(limit), 100),
        search,
        onlyActive: onlyActive === 'true',
      });

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async findById(req, res, next) {
    try {
      const { id } = req.params;
      const patient = await patientRepository.findById(id);

      if (!patient) {
        const { NotFoundError } = await import('../../shared/errors/errors.js');
        return next(new NotFoundError(`Paciente con id ${id} no encontrado`));
      }

      return successResponse(res, patient);
    } catch (error) {
      next(error);
    }
  }
}

export default new PatientController();