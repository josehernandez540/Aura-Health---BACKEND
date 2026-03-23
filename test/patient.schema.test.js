import { createPatientSchema} from '../src/presentation/middlewares/schemas/createPatient.schema.js';
import { updatePatientSchema } from '../src/presentation/middlewares/schemas/updatePatient.schema.js';
import { changePasswordSchema } from '../src/presentation/middlewares/schemas/changePassword.schema.js';

describe('createPatientSchema', () => {
  const VALID = {
    name: 'María García',
    documentNumber: '1234567890',
    birthDate: '1985-06-15',
    phone: '+57 300 1234567',
    email: 'maria@example.com',
  };

  it('should accept a fully valid payload', () => {
    expect(createPatientSchema.safeParse(VALID).success).toBe(true);
  });

  it('should accept payload without optional fields', () => {
    const { birthDate, phone, email, ...minimal } = VALID;
    expect(createPatientSchema.safeParse(minimal).success).toBe(true);
  });

  it('should reject missing name', () => {
    const { name, ...rest } = VALID;
    expect(createPatientSchema.safeParse(rest).success).toBe(false);
  });

  it('should reject missing documentNumber', () => {
    const { documentNumber, ...rest } = VALID;
    expect(createPatientSchema.safeParse(rest).success).toBe(false);
  });

  it('should reject documentNumber shorter than 5 chars', () => {
    const result = createPatientSchema.safeParse({ ...VALID, documentNumber: '123' });
    expect(result.success).toBe(false);
  });

  it('should reject documentNumber with special characters', () => {
    const result = createPatientSchema.safeParse({ ...VALID, documentNumber: '123 456!' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const result = createPatientSchema.safeParse({ ...VALID, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid birthDate format', () => {
    const result = createPatientSchema.safeParse({ ...VALID, birthDate: 'not-a-date' });
    expect(result.success).toBe(false);
  });

  it('should trim whitespace on string fields', () => {
    const result = createPatientSchema.safeParse({ ...VALID, name: '  María  ', email: '  maria@example.com  ' });
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('María');
    expect(result.data.email).toBe('maria@example.com');
  });
});

describe('updatePatientSchema', () => {
  it('should accept partial update with only name', () => {
    expect(updatePatientSchema.safeParse({ name: 'Nuevo Nombre' }).success).toBe(true);
  });

  it('should accept partial update with only phone', () => {
    expect(updatePatientSchema.safeParse({ phone: '+57 310 000' }).success).toBe(true);
  });

  it('should reject empty object (no fields to update)', () => {
    const result = updatePatientSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject if email is provided but invalid', () => {
    const result = updatePatientSchema.safeParse({ email: 'bad-email' });
    expect(result.success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('should accept valid password change', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'Aura1234!',
      newPassword: 'NuevaPass99',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing currentPassword', () => {
    const result = changePasswordSchema.safeParse({ newPassword: 'NuevaPass99' });
    expect(result.success).toBe(false);
  });

  it('should reject newPassword shorter than 8 chars', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'Aura1234!',
      newPassword: 'Abc1',
    });
    expect(result.success).toBe(false);
  });

  it('should reject newPassword without uppercase', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'Aura1234!',
      newPassword: 'sinmayuscula9',
    });
    expect(result.success).toBe(false);
  });

  it('should reject newPassword without number', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'Aura1234!',
      newPassword: 'SinNumero!!',
    });
    expect(result.success).toBe(false);
  });
});