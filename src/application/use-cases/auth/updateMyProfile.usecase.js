import { NotFoundError } from '../../../shared/errors/errors.js';

class UpdateMyProfileUseCase {
    constructor({ userRepository, doctorRepository, auditService }) {
        this.userRepository = userRepository;
        this.doctorRepository = doctorRepository;
        this.auditService = auditService;
    }

    async execute({ userId, name, email }) {
        const user = await this.userRepository.findByIdWithDoctor(userId);

        if (!user) {
            throw new NotFoundError('Usuario no encontrado');
        }

        if (email !== undefined) {
            await this.userRepository.updateProfile(userId, { email });
        }

        if (name !== undefined) {
            if (user.doctors) {
                await this.doctorRepository.update(user.doctors.id, { name });
            } else {
                await this.userRepository.updateProfile(userId, { name });
            }
        }

        await this.auditService.log({
            userId,
            action: 'UPDATE_MY_PROFILE',
            entityType: 'USER',
            entityId: userId,
            metadata: { name: name ?? null, email: email ?? null },
            severity: 'INFO',
        });
    }
}

export default UpdateMyProfileUseCase;
