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
import CancelAppointmentUseCase from '../../application/use-cases/appointment/cancelAppointment.usecase.js';
import RescheduleAppointmentUseCase from '../../application/use-cases/appointment/rescheduleAppointment.usecase.js';
import emailService from '../../infrastructure/email/email.service.js';
import MarkAppointmentNoShowUseCase from '../../application/use-cases/appointment/markAppointmentNoShow.usecase.js';

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
const rescheduleRaw = new RescheduleAppointmentUseCase(appointmentRepository, emailService);

const cancelRaw = new CancelAppointmentUseCase(
  appointmentRepository,
  patientRepository,
  emailService,
);

const noShowRaw = new MarkAppointmentNoShowUseCase(
  appointmentRepository,
);

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

const rescheduleUseCase = {
  execute: withAudit(rescheduleRaw.execute.bind(rescheduleRaw), auditService, {
    action: AuditActions.APPOINTMENT_RESCHEDULED,
    entityType: 'APPOINTMENT',
    getUserId: (_r, _p, ctx) => ctx?.user?.userId ?? null,
    getEntityId: (_r, params) => params.appointmentId,
    getMetadata: (params) => ({
      appointmentId: params.appointmentId,
      newDate: params.newDate,
      newStartTime: params.newStartTime,
      newEndTime: params.newEndTime,
      reason: params.reason ?? null,
    }),
  }),
};

const cancelUseCase = {
  execute: withAudit(cancelRaw.execute.bind(cancelRaw), auditService, {
    action: AuditActions.APPOINTMENT_CANCELLED_BY_ADMIN,
    entityType: 'APPOINTMENT',
    getUserId: (_r, _p, ctx) => ctx?.user?.userId ?? null,
    getEntityId: (_r, params) => params.appointmentId,
    getMetadata: (params) => ({
      reason: params.reason,
      performedBy: params.performedBy,
    }),
  }),
};

const noShowUseCase = {
  execute: withAudit(noShowRaw.execute.bind(noShowRaw), auditService, {
    action: AuditActions.APPOINTMENT_NO_SHOW,
    entityType: 'APPOINTMENT',
    getUserId: (_r, _p, ctx) => ctx?.user?.userId ?? null,
    getEntityId: (_r, params) => params.appointmentId,
    getMetadata: (params) => ({
      reason: params.reason ?? null,
      performedBy: params.performedBy,
    }),
  }),
};

class AppointmentController {
  // A DOCTOR may only modify appointments assigned to them; ADMIN is unrestricted.
  // Throws NotFoundError (rather than 403) so a doctor can't probe for the
  // existence of appointments that aren't theirs.
  async _assertCanModify(req, appointmentId) {
    if (req.user?.role !== 'DOCTOR') return;

    const doctor = await doctorRepository.findByUserId(req.user.userId);
    const appointment = doctor && (await appointmentRepository.findById(appointmentId));

    if (!doctor || !appointment || appointment.doctorId !== doctor.id) {
      throw new NotFoundError(`Cita con id ${appointmentId} no encontrada`);
    }
  }

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

      await this._assertCanModify(req, appointmentId);

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

  async reschedule(req, res, next) {
    try {
      const { id: appointmentId } = req.params;
      const { newDate, newStartTime, newEndTime, reason } = req.body;
      const performedBy = req.user?.userId ?? null;

      await this._assertCanModify(req, appointmentId);

      const result = await rescheduleUseCase.execute({
        appointmentId,
        newDate,
        newStartTime,
        newEndTime,
        reason,
        performedBy,
      });
 
      return successResponse(res, result, 'Cita reprogramada exitosamente');
    } catch (error) {
      next(error);
    }
  }

  async cancel(req, res, next) {
    try {
      const { id: appointmentId } = req.params;
      const { reason } = req.body;
      const performedBy = req.user?.userId ?? null;

      await this._assertCanModify(req, appointmentId);

      const result = await cancelUseCase.execute({
        appointmentId,
        reason,
        performedBy,
      });

      return successResponse(res, result, 'Cita cancelada correctamente');
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

      let scopedDoctorId = doctorId;

      if (req.user?.role === 'DOCTOR') {
        const doctor = await doctorRepository.findByUserId(req.user.userId);

        if (!doctor) {
          return successResponse(res, { items: [], total: 0, page: Number(page), limit: Number(limit), totalPages: 0 });
        }

        scopedDoctorId = doctor.id;
      }

      const result = await appointmentRepository.findAll({
        page: Number(page),
        limit: Math.min(Number(limit), 100),
        doctorId: scopedDoctorId,
        patientId,
        date,
        status,
      });

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async markNoShow(req, res, next) {
    try {
      const { id: appointmentId } = req.params;
      const { reason } = req.body;

      const performedBy = req.user?.userId ?? null;

      await this._assertCanModify(req, appointmentId);

      const result = await noShowUseCase.execute({
        appointmentId,
        reason,
        performedBy,
      });

      return successResponse(
        res,
        result,
        'Cita marcada como no asistida',
      );
    } catch (error) {
      next(error);
    }
  }
}

export default new AppointmentController();