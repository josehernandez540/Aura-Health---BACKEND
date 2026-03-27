import AuditService from "../../application/services/audit.service.js";
import CreateDoctorUseCase from "../../application/use-cases/doctors/createDoctor.usecase.js";
import emailService from "../../infrastructure/email/email.service.js";
import AuditRepository from '../../infrastructure/repositories/audit.repository.js';
import PrismaDoctorRepository from "../../infrastructure/repositories/doctor.repository.js";
import PrismaRoleRepository from "../../infrastructure/repositories/role.repository.js";
import PrismaUserRepository from "../../infrastructure/repositories/user.repository.js";
import { successResponse } from "../../shared/utils/apiResponse.js";
import { withAudit } from "../../shared/utils/audit-wrapper.js";
import { AuditActions } from '../../domain/constants/audit-actions.js';
import ToggleDoctorStatusUseCase from "../../application/use-cases/doctors/toggleDoctorStatus.usecase.js";
import UpdateDoctorUseCase from "../../application/use-cases/doctors/updateDoctor.usecase.js";


const userRepository = new PrismaUserRepository();
const doctorRepository = new PrismaDoctorRepository();
const roleRepository = new PrismaRoleRepository();
const auditRepository = new AuditRepository();
const auditService = new AuditService(auditRepository);
const toggleStatusRaw = new ToggleDoctorStatusUseCase(doctorRepository);
const updateDoctorRaw = new UpdateDoctorUseCase(doctorRepository);

const createDoctorUseCaseRaw = new CreateDoctorUseCase(
  userRepository,
  doctorRepository,
  roleRepository,
  emailService
);

const createDoctorUseCase = {
  execute: withAudit(
    createDoctorUseCaseRaw.execute.bind(createDoctorUseCaseRaw),
    auditService,
    {
      action: AuditActions.USER_CREATED,
      entityType: 'DOCTOR',
      getUserId: (_result, _params, context) => context.user?.id ?? null,
      getEntityId: (_result, _params, context) => context.doctor?.id ?? null,
      getMetadata: (params) => ({
        email: params.email,
        name: params.name,
        specialization: params.specialization,
      }),
    }
  ),
};

const toggleStatusUseCase = {
  execute: withAudit(
    toggleStatusRaw.execute.bind(toggleStatusRaw),
    auditService,
    {
      action: AuditActions.DOCTOR_STATUS_CHANGED,
      entityType: 'DOCTOR',
      getUserId: (_result, _params, context) => context?.user?.userId,
      getEntityId: (_result, params) => params.doctorId,
      getMetadata: (params) => ({
        newStatus: params.status,
        performedBy: params.performedBy,
      }),
    }
  ),
};

const updateDoctorUseCase = {
  execute: withAudit(
    updateDoctorRaw.execute.bind(updateDoctorRaw),
    auditService,
    {
      action: AuditActions.DOCTOR_UPDATED,
      entityType: 'DOCTOR',
      getUserId: (_result, _params, context) => context?.user?.userId ?? null,
      getEntityId: (_result, params) => params.doctorId,
      getMetadata: (params) => ({
        name: params.name,
        specialization: params.specialization,
        licenseNumber: params.licenseNumber,
      }),
    }
  ),
};

class DoctorController {
  async create(req, res, next) {
    try {
      const result = await createDoctorUseCase.execute(req.body);
      return successResponse(res, result, 'Médico creado exitosamente');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id: doctorId } = req.params;
      const performedBy = req.user.userId;

      const result = await toggleStatusUseCase.execute(
        { doctorId, performedBy },
      );
      const msg = result.is_active ? 'activado' : 'inactivado';
      return successResponse(res, result, `Médico ${msg} correctamente`);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await doctorRepository.findAll({
        page: Number(page),
        limit: Math.min(Number(limit), 100),
      });
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async findById(req, res, next) {
    try {
      const { id } = req.params;
      const doctor = await doctorRepository.findByIdWithDetails(id);

      if (!doctor) {
        const { NotFoundError } = await import('../../shared/errors/errors.js');
        return next(new NotFoundError(`Médico con id ${id} no encontrado`));
      }

      const result = {
        id: doctor.id,
        name: doctor.name,
        specialization: doctor.specialization,
        licenseNumber: doctor.license_number,
        isActive: doctor.is_active,
        statusChangedAt: doctor.status_changed_at,
        user: doctor.users
          ? {
            id: doctor.users.id,
            email: doctor.users.email,
            isActive: doctor.users.is_active,
            role: doctor.users.roles?.name,
            createdAt: doctor.users.created_at,
          }
          : null,
        appointments: doctor.appointments.map((a) => ({
          id: a.id,
          date: a.date,
          startTime: a.start_time,
          endTime: a.end_time,
          status: a.status,
          notes: a.notes,
          patient: a.patients
            ? {
              id: a.patients.id,
              name: a.patients.name,
              documentNumber: a.patients.document_number,
              phone: a.patients.phone,
              email: a.patients.email,
            }
            : null,
        })),
        treatments: doctor.treatments.map((t) => ({
          id: t.id,
          description: t.description,
          status: t.status,
          createdAt: t.created_at,
          patient: t.patients
            ? {
              id: t.patients.id,
              name: t.patients.name,
              documentNumber: t.patients.document_number,
            }
            : null,
        })),
        stats: {
          totalAppointments: doctor.appointments.length,
          scheduledAppointments: doctor.appointments.filter(
            (a) => a.status === 'SCHEDULED'
          ).length,
          completedAppointments: doctor.appointments.filter(
            (a) => a.status === 'COMPLETED'
          ).length,
          cancelledAppointments: doctor.appointments.filter(
            (a) => a.status === 'CANCELLED'
          ).length,
          totalTreatments: doctor.treatments.length,
          activeTreatments: doctor.treatments.filter(
            (t) => t.status === 'ACTIVE'
          ).length,
          uniquePatients: new Set(doctor.appointments.map((a) => a.patient_id)).size,
        },
      };

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id: doctorId } = req.params;
      const result = await updateDoctorUseCase.execute({ doctorId, ...req.body });
      return successResponse(res, result, 'Médico actualizado exitosamente');
    } catch (error) {
      next(error);
    }
  }

}

export default new DoctorController();