import { jest } from '@jest/globals';
import CreatePatientUseCase from '../src/application/use-cases/patient/createPatient.usecase.js';

function buildRepo(overrides = {}) {
  return {
    findByDocumentNumber: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'patient-1',
      name: 'María García',
      document_number: '1234567890',
      birth_date: new Date('1985-06-15'),
      phone: '+57 300 1234567',
      email: 'maria@example.com',
      is_active: true,
      created_at: new Date(),
    }),
    ...overrides,
  };
}

const VALID_INPUT = {
  name: 'María García',
  documentNumber: '1234567890',
  birthDate: '1985-06-15',
  phone: '+57 300 1234567',
  email: 'maria@example.com',
};

describe('CreatePatientUseCase', () => {
  it('should create a patient and return formatted data', async () => {
    const repo = buildRepo();
    const useCase = new CreatePatientUseCase(repo);

    const result = await useCase.execute(VALID_INPUT);

    expect(result.id).toBe('patient-1');
    expect(result.name).toBe('María García');
    expect(result.documentNumber).toBe('1234567890');
    expect(result.isActive).toBe(true);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ documentNumber: '1234567890' })
    );
  });

  it('should populate context.patient after creation', async () => {
    const repo = buildRepo();
    const useCase = new CreatePatientUseCase(repo);
    const context = {};

    await useCase.execute(VALID_INPUT, context);

    expect(context.patient).toBeDefined();
    expect(context.patient.id).toBe('patient-1');
  });

  it('should throw ConflictError if document number already exists', async () => {
    const repo = buildRepo({
      findByDocumentNumber: jest.fn().mockResolvedValue({ id: 'existing-patient' }),
    });
    const useCase = new CreatePatientUseCase(repo);

    await expect(useCase.execute(VALID_INPUT)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'CONFLICT_ERROR',
    });

    expect(repo.create).not.toHaveBeenCalled();
  });

  it('should create patient without optional fields', async () => {
    const repo = buildRepo({
      create: jest.fn().mockResolvedValue({
        id: 'patient-2',
        name: 'Juan Doe',
        document_number: '9876543210',
        birth_date: null,
        phone: null,
        email: null,
        is_active: true,
        created_at: new Date(),
      }),
    });
    const useCase = new CreatePatientUseCase(repo);

    const result = await useCase.execute({
      name: 'Juan Doe',
      documentNumber: '9876543210',
    });

    expect(result.name).toBe('Juan Doe');
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
  });
});