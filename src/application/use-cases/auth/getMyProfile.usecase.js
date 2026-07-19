import { NotFoundError } from '../../../shared/errors/errors.js';

class GetMyProfileUseCase {
    constructor({ userRepository }) {
        this.userRepository = userRepository;
    }

    async execute({ userId }) {
        const user = await this.userRepository.findByIdWithDoctor(userId);

        if (!user) {
            throw new NotFoundError('Usuario no encontrado');
        }

        return {
            id: user.id,
            email: user.email,
            role: user.roles.name,
            name: user.doctors ? user.doctors.name : user.name,
            doctor: user.doctors
                ? {
                    id: user.doctors.id,
                    specialization: user.doctors.specialization,
                    licenseNumber: user.doctors.license_number,
                }
                : null,
        };
    }
}

export default GetMyProfileUseCase;
