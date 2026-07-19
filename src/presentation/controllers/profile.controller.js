import PrismaUserRepository from '../../infrastructure/repositories/user.repository.js';
import PrismaDoctorRepository from '../../infrastructure/repositories/doctor.repository.js';
import AuditRepository from '../../infrastructure/repositories/audit.repository.js';
import AuditService from '../../application/services/audit.service.js';
import GetMyProfileUseCase from '../../application/use-cases/auth/getMyProfile.usecase.js';
import UpdateMyProfileUseCase from '../../application/use-cases/auth/updateMyProfile.usecase.js';

const userRepository = new PrismaUserRepository();
const doctorRepository = new PrismaDoctorRepository();
const auditRepository = new AuditRepository();
const auditService = new AuditService(auditRepository);

const getMyProfileUseCase = new GetMyProfileUseCase({ userRepository });
const updateMyProfileUseCase = new UpdateMyProfileUseCase({
    userRepository,
    doctorRepository,
    auditService,
});

class ProfileController {
    async getMe(req, res, next) {
        try {
            const profile = await getMyProfileUseCase.execute({ userId: req.user.userId });
            return res.status(200).json({ success: true, data: profile });
        } catch (error) {
            next(error);
        }
    }

    async updateMe(req, res, next) {
        try {
            const { name, email } = req.body;

            await updateMyProfileUseCase.execute({ userId: req.user.userId, name, email });
            const profile = await getMyProfileUseCase.execute({ userId: req.user.userId });

            return res.status(200).json({
                success: true,
                message: 'Perfil actualizado correctamente',
                data: profile,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new ProfileController();
