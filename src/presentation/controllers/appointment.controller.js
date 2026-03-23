import AuditService from '../../application/services/audit.service.js';
import CreateAppointmentUseCase from '../../application/use-cases/appointment/createAppointment.usecase.js';
import UpdateAppointmentStatusUseCase from '../../application/use-cases/appointment/updateAppointmentStatus.usecase.js';
import AuditRepository from '../../infrastructure/repositories/audit.repository.js';
import PrismaAppointmentRepository from '../../infrastructure/repositories/appointment.repository.js';
import PrismaDoctorRepository from '../../infrastructure/repositories/doctor.repository.js';
import PrismaPatientRepository from '../../infrastructure/repositories/patient.repository.js';
import { successResponse } from '../../shared/utils/apiResponse.js';
import { withAudit } from '../../shared/utils/audit-wrapper.js';
import { AuditActions } from '../../domain/constants/audit-actions.js';
import { NotFoundError } from '../../shared/errors/errors.js';

const appointmentRepository = new PrismaAppointmentRepository();
const doctorRepository = new PrismaDoctorRepository();
const patientRepository = new PrismaPatientRepository();
const auditRepository = new AuditRepository();
const auditService = new AuditService(auditRepository);

const createRaw = new CreateAppointmentUseCase(
  appointmentRepository,
  doctorRepository,
  patientRepository
);

const updateStatusRaw = new UpdateAppointmentStatusUseCase(appointmentRepository);

const createUseCase = {
  execute: withAudit(createRaw.execute.bind(createRaw), auditService, {
    action: AuditActions.APPOINTMENT_CREATED,
    entityType: 'APPOINTMENT',
    getUserId: (_r, _p, ctx) => ctx?.user?.userId ?? null,
    getEntityId: (_r, _p, ctx) => ctx?.appointment?.id ?? null,
    getMetadata: (params) => ({
      doctorId: params.doctorId,
      patientId: params.patientId,
      date: params.date,
      startTime: params.startTime,
      endTime: params.endTime,
    }),
  }),
};

const updateStatusUseCase = {
  execute: withAudit(updateStatusRaw.execute.bind(updateStatusRaw), auditService, {
    action: AuditActions.APPOINTMENT_CANCELLED,
    entityType: 'APPOINTMENT',
    getUserId: (_r, _p, ctx) => ctx?.user?.userId ?? null,
    getEntityId: (_r, params) => params.appointmentId,
    getMetadata: (params) => ({
      newStatus: params.status,
      performedBy: params.performedBy,
    }),
  }),
};

class AppointmentController {
  async create(req, res, next) {
    try {
      const createdBy = req.user?.userId ?? null;
      const result = await createUseCase.execute({ ...req.body, createdBy });
      return successResponse(res, result, 'Cita programada exitosamente');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id: appointmentId } = req.params;
      const { status, notes } = req.body;
      const performedBy = req.user?.userId ?? null;

      const result = await updateStatusUseCase.execute({
        appointmentId,
        status,
        notes,
        performedBy,
      });

      return successResponse(res, result, `Cita actualizada a estado: ${status}`);
    } catch (error) {
      next(error);
    }
  }

  async findById(req, res, next) {
    try {
      const { id } = req.params;
      const appointment = await appointmentRepository.findById(id);

      if (!appointment) {
        return next(new NotFoundError(`Cita con id ${id} no encontrada`));
      }

      return successResponse(res, appointment);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        doctorId,
        patientId,
        date,
        status,
      } = req.query;

      const result = await appointmentRepository.findAll({
        page: Number(page),
        limit: Math.min(Number(limit), 100),
        doctorId,
        patientId,
        date,
        status,
      });

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export default new AppointmentController();