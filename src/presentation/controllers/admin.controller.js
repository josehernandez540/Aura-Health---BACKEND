import AuditService from '../../application/services/audit.service.js';
import CreateAdminUserUseCase from '../../application/use-cases/admin/createAdminUser.usecase.js';
import UpdateAdminUserUseCase from '../../application/use-cases/admin/updateAdminUser.usecase.js';
import ToggleAdminStatusUseCase from '../../application/use-cases/admin/toggleAdminStatus.usecase.js';
import AuditRepository from '../../infrastructure/repositories/audit.repository.js';
import PrismaAdminUserRepository from '../../infrastructure/repositories/adminUser.repository.js';
import emailService from '../../infrastructure/email/email.service.js';
import { successResponse } from '../../shared/utils/apiResponse.js';
import { withAudit } from '../../shared/utils/audit-wrapper.js';
import { NotFoundError } from '../../shared/errors/errors.js';

const ADMIN_ACTIONS = {
  ADMIN_USER_CREATED: 'ADMIN_USER_CREATED',
  ADMIN_USER_UPDATED: 'ADMIN_USER_UPDATED',
  ADMIN_USER_STATUS_CHANGED: 'ADMIN_USER_STATUS_CHANGED',
};

const adminUserRepository = new PrismaAdminUserRepository();
const auditRepository = new AuditRepository();
const auditService = new AuditService(auditRepository);

const createRaw = new CreateAdminUserUseCase(adminUserRepository, emailService);
const updateRaw = new UpdateAdminUserUseCase(adminUserRepository);
const toggleStatusRaw = new ToggleAdminStatusUseCase(adminUserRepository);

const createUseCase = {
  execute: withAudit(createRaw.execute.bind(createRaw), auditService, {
    action: ADMIN_ACTIONS.ADMIN_USER_CREATED,
    entityType: 'ADMIN_USER',
    getUserId: (_r, _p, ctx) => ctx?.user?.id ?? null,
    getEntityId: (_r, _p, ctx) => ctx?.user?.id ?? null,
    getMetadata: (params) => ({ email: params.email, name: params.name }),
  }),
};

const updateUseCase = {
  execute: withAudit(updateRaw.execute.bind(updateRaw), auditService, {
    action: ADMIN_ACTIONS.ADMIN_USER_UPDATED,
    entityType: 'ADMIN_USER',
    getUserId: (_r, _p, ctx) => ctx?.user?.id ?? null,
    getEntityId: (_r, params) => params.adminId,
    getMetadata: (params) => ({ adminId: params.adminId, email: params.email }),
  }),
};

const toggleStatusUseCase = {
  execute: withAudit(toggleStatusRaw.execute.bind(toggleStatusRaw), auditService, {
    action: ADMIN_ACTIONS.ADMIN_USER_STATUS_CHANGED,
    entityType: 'ADMIN_USER',
    getUserId: (_r, _p, ctx) => ctx?.user?.id ?? null,
    getEntityId: (_r, params) => params.adminId,
    getMetadata: (params) => ({ newStatus: params.status }),
  }),
};

class AdminController {
  async findAll(req, res, next) {
    try {
      const { page = 1, limit = 20, search = '' } = req.query;

      const result = await adminUserRepository.findAll({
        page: Number(page),
        limit: Math.min(Number(limit), 100),
        search,
      });

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async findById(req, res, next) {
    try {
      const { id } = req.params;
      const admin = await adminUserRepository.findById(id);

      if (!admin) {
        return next(new NotFoundError(`Administrador con id ${id} no encontrado`));
      }

      return successResponse(res, admin);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const result = await createUseCase.execute(req.body);
      return successResponse(res, result, 'Administrador creado exitosamente');
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id: adminId } = req.params;
      const result = await updateUseCase.execute({ adminId, ...req.body });
      return successResponse(res, result, 'Administrador actualizado exitosamente');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id: adminId } = req.params;
      const { status } = req.body;
      const requestingUserId = req.user.userId;

      const result = await toggleStatusUseCase.execute({
        adminId,
        status,
        requestingUserId,
      });

      const msg = status === 'ACTIVE' ? 'activado' : 'inactivado';
      return successResponse(res, result, `Administrador ${msg} correctamente`);
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminController();