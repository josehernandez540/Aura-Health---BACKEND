import PrismaUserRepository from '../../infrastructure/repositories/user.repository.js';
import LoginUseCase from '../../application/use-cases/auth/login.usecase.js';
import jwtService from '../../infrastructure/security/jwt.service.js';
import { successResponse } from '../../shared/utils/apiResponse.js';
import { withAudit } from '../../shared/utils/audit-wrapper.js';
import { AuditActions } from '../../domain/constants/audit-actions.js';
import AuditService from '../../application/services/audit.service.js';
import AuditRepository from '../../infrastructure/repositories/audit.repository.js';
import ChangePasswordUseCase from '../../application/use-cases/auth/changePassword.usecase.js';

const userRepository = new PrismaUserRepository();
const auditRepository = new AuditRepository();
const auditService = new AuditService(auditRepository);

const loginUseCaseRaw = new LoginUseCase(userRepository, jwtService);
const changePasswordUseCaseRaw = new ChangePasswordUseCase(userRepository, jwtService);

const loginUseCase = {
  execute: withAudit(
    loginUseCaseRaw.execute.bind(loginUseCaseRaw),
    auditService,
    {
      action: AuditActions.USER_LOGIN,
      entityType: 'USER',

      getUserId: (result, params, context) => context.user?.id,
      getEntityId: (result, params, context) => context.user?.id,
      getMetadata: (params) => ({ email: params.email })
    }
  )
};

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const result = await loginUseCase.execute({ email, password });

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;
 
      const result = await changePasswordUseCaseRaw.execute({
        userId,
        currentPassword,
        newPassword,
      });
 
      return successResponse(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();