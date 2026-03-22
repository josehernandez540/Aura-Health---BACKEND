import { createDoctorSchema } from '../src/presentation/middlewares/schemas/createDoctor.schema.js';

describe('createDoctorSchema', () => {
  const VALID = {
    name: 'Dr. Juan Pérez',
    documentNumber: '1234567890',
    specialization: 'Cardiología',
    email: 'juan.perez@aura.com',
    licenseNumber: 'MED-2024-001',
    phone: '+57 300 0000000',
  };

  it('should accept a fully valid payload', () => {
    const result = createDoctorSchema.safeParse(VALID);
    expect(result.success).toBe(true);
  });

  it('should accept a payload without optional fields', () => {
    const { licenseNumber, phone, ...minimal } = VALID;
    const result = createDoctorSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it('should reject missing name', () => {
    const { name, ...rest } = VALID;
    const result = createDoctorSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const result = createDoctorSchema.safeParse({ ...VALID, email: 'not-an-email' });
    expect(result.success).toBe(false);
    // Zod v4 usa result.error.issues (antes era .errors)
    const issues = result.error.issues ?? result.error.errors ?? [];
    const msgs = issues.map((e) => e.message).join(' ');
    expect(msgs.toLowerCase()).toContain('correo');
  });

  it('should reject document number with special chars', () => {
    const result = createDoctorSchema.safeParse({
      ...VALID,
      documentNumber: '123 456!',
    });
    expect(result.success).toBe(false);
  });

  it('should reject name shorter than 2 chars', () => {
    const result = createDoctorSchema.safeParse({ ...VALID, name: 'A' });
    expect(result.success).toBe(false);
  });

  it('should trim whitespace on string fields', () => {
    const result = createDoctorSchema.safeParse({
      ...VALID,
      name: '  Dr. Juan  ',
      email: '  juan@aura.com  ',
    });
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('Dr. Juan');
    expect(result.data.email).toBe('juan@aura.com');
  });
});