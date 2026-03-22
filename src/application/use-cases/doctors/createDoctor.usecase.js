import bcrypt from 'bcryptjs';
import { ConflictError } from '../../../shared/errors/errors.js';
import { Role } from '../../../domain/entities/role.enum.js';

function generateTempPassword() {
  const digits = Math.floor(1000 + Math.random() * 9000);
  const specials = '!@#$%&*';
  const special = specials[Math.floor(Math.random() * specials.length)];
  return `Aura${digits}${special}`;
}

class CreateDoctorUseCase {
  constructor(userRepository, doctorRepository, roleRepository, emailService) {
    this.userRepository = userRepository;
    this.doctorRepository = doctorRepository;
    this.roleRepository = roleRepository;
    this.emailService = emailService;
  }

  async execute(
    { name, documentNumber, specialization, email, licenseNumber, phone },
    context = {}
  ) {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError('El correo electrónico ya está registrado');
    }

    const existingDoc = await this.doctorRepository.findByDocumentNumber(documentNumber);
    if (existingDoc) {
      throw new ConflictError('El número de identificación ya está registrado');
    }

    const role = await this.roleRepository.findByName(Role.DOCTOR);
    if (!role) {
      throw new Error('El rol ' + Role.DOCTOR + ' no existe en el sistema');
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const { user, doctor } = await this.userRepository.createWithDoctor({
      email,
      password: hashedPassword,
      roleId: role.id,
      name,
      documentNumber,
      specialization,
      licenseNumber,
      phone,
    });

    context.doctor = doctor;
    context.user = user;

    try {
      await this.emailService.sendWelcomeEmail({
        to: email,
        name,
        tempPassword,
      });
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError.message);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: 'DOCTOR',
      },
      doctor: {
        id: doctor.id,
        name: doctor.name,
        documentNumber: doctor.document_number,
        specialization: doctor.specialization,
        licenseNumber: doctor.license_number,
      },
    };
  }
}

export default CreateDoctorUseCase;