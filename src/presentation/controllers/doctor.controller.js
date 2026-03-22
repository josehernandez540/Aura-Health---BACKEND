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

const userRepository = new PrismaUserRepository();
const doctorRepository = new PrismaDoctorRepository();
const roleRepository = new PrismaRoleRepository();
const auditRepository = new AuditRepository();
const auditService = new AuditService(auditRepository);

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

class DoctorController {
  async create(req, res, next) {
    try {
      const result = await createDoctorUseCase.execute(req.body);
      return successResponse(res, result, 'Médico creado exitosamente');
    } catch (error) {
      next(error);
    }
  }
}

export default new DoctorController();