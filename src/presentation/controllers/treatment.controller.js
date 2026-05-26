import AuditService from '../../application/services/audit.service.js';
import CreateTreatmentUseCase from '../../application/use-cases/treatment/createTreatment.usecase.js';
import UpdateTreatmentStatusUseCase from '../../application/use-cases/treatment/updateTreatmentStatus.usecase.js';
import AuditRepository from '../../infrastructure/repositories/audit.repository.js';
import PrismaTreatmentRepository from '../../infrastructure/repositories/treatment.repository.js';
import PrismaPatientRepository from '../../infrastructure/repositories/patient.repository.js';
import PrismaDoctorRepository from '../../infrastructure/repositories/doctor.repository.js';
import { successResponse } from '../../shared/utils/apiResponse.js';
import { withAudit } from '../../shared/utils/audit-wrapper.js';
import { NotFoundError } from '../../shared/errors/errors.js';
import ApproveTreatmentUseCase from '../../application/use-cases/treatment/approveTreatment.usecase.js';
import UpdateTreatmentUseCase from '../../application/use-cases/treatment/updateTreatment.usecase.js';
import PrismaTreatmentHistoryRepository from '../../infrastructure/repositories/treatmentHistory.repository.js';

const treatmentRepository = new PrismaTreatmentRepository();
const patientRepository = new PrismaPatientRepository();
const doctorRepository = new PrismaDoctorRepository();
const treatmentHistoryRepository = new PrismaTreatmentHistoryRepository();
const auditRepository = new AuditRepository();
const auditService = new AuditService(auditRepository);

const TREATMENT_ACTIONS = {
    TREATMENT_CREATED: 'TREATMENT_CREATED',
    TREATMENT_STATUS_CHANGED: 'TREATMENT_STATUS_CHANGED',
    TREATMENT_APPROVED: 'TREATMENT_APPROVED',
};

const createRaw = new CreateTreatmentUseCase(
    treatmentRepository,
    patientRepository,
    doctorRepository
);

const updateStatusRaw = new UpdateTreatmentStatusUseCase(treatmentRepository);
const approveRaw = new ApproveTreatmentUseCase(treatmentRepository);
const updateRaw = new UpdateTreatmentUseCase(
    treatmentRepository,
    treatmentHistoryRepository
);

const updateUseCase = {
    execute: withAudit(updateRaw.execute.bind(updateRaw), auditService, {
        action: 'TREATMENT_UPDATED',
        entityType: 'TREATMENT',

        getUserId: (_r, _p, ctx) =>
            ctx?.user?.userId ?? null,

        getEntityId: (_r, params) =>
            params.treatmentId,

        getMetadata: (params) => ({
            reason: params.reason,
        }),
    }),
};

const createUseCase = {
    execute: withAudit(createRaw.execute.bind(createRaw), auditService, {
        action: TREATMENT_ACTIONS.TREATMENT_CREATED,
        entityType: 'TREATMENT',
        getUserId: (_r, _p, ctx) => ctx?.user?.userId ?? null,
        getEntityId: (_r, _p, ctx) => ctx?.treatment?.id ?? null,
        getMetadata: (params) => ({
            patientId: params.patientId,
            doctorId: params.doctorId,
            description: params.description,
            medicationCount: params.medications?.length ?? 0,
        }),
    }),
};

const updateStatusUseCase = {
    execute: withAudit(updateStatusRaw.execute.bind(updateStatusRaw), auditService, {
        action: TREATMENT_ACTIONS.TREATMENT_STATUS_CHANGED,
        entityType: 'TREATMENT',
        getUserId: (_r, _p, ctx) => ctx?.user?.userId ?? null,
        getEntityId: (_r, params) => params.treatmentId,
        getMetadata: (params) => ({ newStatus: params.status }),
    }),
};


const approveUseCase = {
    execute: withAudit(approveRaw.execute.bind(approveRaw), auditService, {
        action: TREATMENT_ACTIONS.TREATMENT_APPROVED,
        entityType: 'TREATMENT',
        getUserId: (_r, _p, ctx) => ctx?.user?.userId ?? null,
        getEntityId: (_r, params) => params.treatmentId,
        getMetadata: (params) => ({
            approvedBy: params.approvedBy,
            notes: params.notes ?? null,
        }),
    }),
};

class TreatmentController {
    async create(req, res, next) {
        try {
            const currentUserId = req.user?.userId;
            const result = await createUseCase.execute({
                ...req.body,
                currentUserId
            });
            return successResponse(res, result, 'Tratamiento creado exitosamente');
        } catch (error) {
            next(error);
        }
    }

    async updateStatus(req, res, next) {
        try {
            const { id: treatmentId } = req.params;
            const { status } = req.body;
            const result = await updateStatusUseCase.execute({ treatmentId, status });
            return successResponse(res, result, `Tratamiento actualizado a estado: ${status}`);
        } catch (error) {
            next(error);
        }
    }

    async findById(req, res, next) {
        try {
            const { id } = req.params;
            const treatment = await treatmentRepository.findById(id);
            if (!treatment) {
                return next(new NotFoundError(`Tratamiento con id ${id} no encontrado`));
            }
            return successResponse(res, treatment);
        } catch (error) {
            next(error);
        }
    }

    async findAll(req, res, next) {
        try {
            const { page = 1, limit = 20, patientId, doctorId, status } = req.query;
            const result = await treatmentRepository.findAll({
                page: Number(page),
                limit: Math.min(Number(limit), 100),
                patientId,
                doctorId,
                status,
            });
            return successResponse(res, result);
        } catch (error) {
            next(error);
        }
    }

    async findByPatient(req, res, next) {
        try {
            const { patientId } = req.params;
            const { page = 1, limit = 20, status } = req.query;
            const result = await treatmentRepository.findByPatientId(patientId, {
                page: Number(page),
                limit: Math.min(Number(limit), 100),
                status,
            });
            return successResponse(res, result);
        } catch (error) {
            next(error);
        }
    }

    async approve(req, res, next) {
        try {
            const { id: treatmentId } = req.params;

            const result = await approveUseCase.execute({
                treatmentId,
                approvedBy: req.user.userId,
                notes: req.body.notes,
            });

            return successResponse(
                res,
                result,
                'Tratamiento aprobado exitosamente'
            );
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {

            const { id: treatmentId } = req.params;

            const result =
                await updateUseCase.execute({
                    treatmentId,

                    description: req.body.description,

                    medications: req.body.medications,

                    reason: req.body.reason,

                    changedBy: req.user.userId,
                });

            return successResponse(
                res,
                result,
                'Tratamiento actualizado exitosamente'
            );

        } catch (error) {
            next(error);
        }
    }

    async history(req, res, next) {
        try {

            const { id } = req.params;

            const history =
                await treatmentHistoryRepository
                    .findByTreatmentId(id);

            return successResponse(res, history);

        } catch (error) {
            next(error);
        }
    }
}

export default new TreatmentController();