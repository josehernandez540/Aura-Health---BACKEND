import bcrypt from 'bcryptjs';
import { jest } from '@jest/globals';
import CreateDoctorUseCase from '../src/application/use-cases/doctors/createDoctor.usecase.js';

const DOCTOR_ROLE = { id: 'role-uuid-doctor', name: 'DOCTOR' };

function buildMocks({
  existingEmail = null,
  existingDoc = null,
  role = DOCTOR_ROLE,
} = {}) {
  const userRepository = {
    findByEmail: jest.fn().mockResolvedValue(existingEmail),
    createWithDoctor: jest.fn().mockResolvedValue({
      user: { id: 'user-1', email: 'nuevo@aura.com' },
      doctor: {
        id: 'doc-1',
        name: 'Dr. Test',
        document_number: '12345',
        specialization: 'Cardiología',
        license_number: 'MED-001',
      },
    }),
  };

  const doctorRepository = {
    findByDocumentNumber: jest.fn().mockResolvedValue(existingDoc),
  };

  const roleRepository = {
    findByName: jest.fn().mockResolvedValue(role),
  };

  const emailService = {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  };

  return { userRepository, doctorRepository, roleRepository, emailService };
}

const VALID_INPUT = {
  name: 'Dr. Test',
  documentNumber: '12345',
  specialization: 'Cardiología',
  email: 'nuevo@aura.com',
  licenseNumber: 'MED-001',
};

describe('CreateDoctorUseCase', () => {
  it('should create a doctor and return user + doctor data', async () => {
    const mocks = buildMocks();
    const useCase = new CreateDoctorUseCase(
      mocks.userRepository,
      mocks.doctorRepository,
      mocks.roleRepository,
      mocks.emailService
    );

    const result = await useCase.execute(VALID_INPUT);

    expect(result.user.email).toBe('nuevo@aura.com');
    expect(result.doctor.name).toBe('Dr. Test');
    expect(mocks.userRepository.createWithDoctor).toHaveBeenCalledTimes(1);
  });

  it('should hash the password before saving', async () => {
    const mocks = buildMocks();
    const useCase = new CreateDoctorUseCase(
      mocks.userRepository,
      mocks.doctorRepository,
      mocks.roleRepository,
      mocks.emailService
    );

    await useCase.execute(VALID_INPUT);

    const { password } = mocks.userRepository.createWithDoctor.mock.calls[0][0];
    expect(password).toMatch(/^\$2b\$/);
    expect(password).not.toBe('123456');
  });

  it('should call sendWelcomeEmail with correct recipient', async () => {
    const mocks = buildMocks();
    const useCase = new CreateDoctorUseCase(
      mocks.userRepository,
      mocks.doctorRepository,
      mocks.roleRepository,
      mocks.emailService
    );

    await useCase.execute(VALID_INPUT);

    expect(mocks.emailService.sendWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: VALID_INPUT.email, name: VALID_INPUT.name })
    );

    const { tempPassword } = mocks.emailService.sendWelcomeEmail.mock.calls[0][0];
    expect(tempPassword).toBeTruthy();
    expect(tempPassword.length).toBeGreaterThan(6);
  });

  it('should throw ConflictError when email already exists', async () => {
    const mocks = buildMocks({ existingEmail: { id: 'other-user' } });
    const useCase = new CreateDoctorUseCase(
      mocks.userRepository,
      mocks.doctorRepository,
      mocks.roleRepository,
      mocks.emailService
    );

    await expect(useCase.execute(VALID_INPUT)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'CONFLICT_ERROR',
    });

    expect(mocks.userRepository.createWithDoctor).not.toHaveBeenCalled();
  });

  it('should throw ConflictError when document number already exists', async () => {
    const mocks = buildMocks({ existingDoc: { id: 'existing-patient' } });
    const useCase = new CreateDoctorUseCase(
      mocks.userRepository,
      mocks.doctorRepository,
      mocks.roleRepository,
      mocks.emailService
    );

    await expect(useCase.execute(VALID_INPUT)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'CONFLICT_ERROR',
    });
  });

  it('should throw an error when DOCTOR role is not found', async () => {
    const mocks = buildMocks({ role: null });
    const useCase = new CreateDoctorUseCase(
      mocks.userRepository,
      mocks.doctorRepository,
      mocks.roleRepository,
      mocks.emailService
    );

    await expect(useCase.execute(VALID_INPUT)).rejects.toThrow(
      'El rol DOCTOR no existe'
    );
  });

  it('should still return success even if email sending fails', async () => {
    const mocks = buildMocks();
    mocks.emailService.sendWelcomeEmail = jest
      .fn()
      .mockRejectedValue(new Error('SMTP error'));

    const useCase = new CreateDoctorUseCase(
      mocks.userRepository,
      mocks.doctorRepository,
      mocks.roleRepository,
      mocks.emailService
    );

    const result = await useCase.execute(VALID_INPUT);
    expect(result.user).toBeDefined();
    expect(result.doctor).toBeDefined();
  });

  it('should populate context with user and doctor for audit wrapper', async () => {
    const mocks = buildMocks();
    const useCase = new CreateDoctorUseCase(
      mocks.userRepository,
      mocks.doctorRepository,
      mocks.roleRepository,
      mocks.emailService
    );

    const context = {};
    await useCase.execute(VALID_INPUT, context);

    expect(context.user).toBeDefined();
    expect(context.doctor).toBeDefined();
    expect(context.doctor.id).toBe('doc-1');
  });
});