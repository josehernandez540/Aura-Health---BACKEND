import {
  createAdminUserSchema,
  updateAdminUserSchema,
  toggleAdminStatusSchema,
} from '../src/presentation/middlewares/schemas/adminUser.schema.js';

describe('createAdminUserSchema', () => {
  const VALID = { email: 'admin@aura.com', name: 'Carlos Admin' };

  it('should accept a fully valid payload', () => {
    expect(createAdminUserSchema.safeParse(VALID).success).toBe(true);
  });

  it('should reject missing email', () => {
    const { email, ...rest } = VALID;
    expect(createAdminUserSchema.safeParse(rest).success).toBe(false);
  });

  it('should reject missing name', () => {
    const { name, ...rest } = VALID;
    expect(createAdminUserSchema.safeParse(rest).success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const result = createAdminUserSchema.safeParse({ ...VALID, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('should reject name shorter than 2 chars', () => {
    const result = createAdminUserSchema.safeParse({ ...VALID, name: 'A' });
    expect(result.success).toBe(false);
  });

  it('should trim whitespace on string fields', () => {
    const result = createAdminUserSchema.safeParse({
      email: '  admin@aura.com  ',
      name: '  Carlos  ',
    });
    expect(result.success).toBe(true);
    expect(result.data.email).toBe('admin@aura.com');
    expect(result.data.name).toBe('Carlos');
  });
});

describe('updateAdminUserSchema', () => {
  it('should accept update with only email', () => {
    expect(updateAdminUserSchema.safeParse({ email: 'nuevo@aura.com' }).success).toBe(true);
  });

  it('should accept update with only name', () => {
    expect(updateAdminUserSchema.safeParse({ name: 'Nuevo Nombre' }).success).toBe(true);
  });

  it('should accept update with both fields', () => {
    expect(
      updateAdminUserSchema.safeParse({ email: 'nuevo@aura.com', name: 'Nuevo' }).success
    ).toBe(true);
  });

  it('should reject empty object (no fields)', () => {
    expect(updateAdminUserSchema.safeParse({}).success).toBe(false);
  });

  it('should reject invalid email format', () => {
    expect(updateAdminUserSchema.safeParse({ email: 'bad-email' }).success).toBe(false);
  });
});

describe('toggleAdminStatusSchema', () => {
  it('should accept ACTIVE', () => {
    expect(toggleAdminStatusSchema.safeParse({ status: 'ACTIVE' }).success).toBe(true);
  });

  it('should accept INACTIVE', () => {
    expect(toggleAdminStatusSchema.safeParse({ status: 'INACTIVE' }).success).toBe(true);
  });

  it('should reject missing status', () => {
    expect(toggleAdminStatusSchema.safeParse({}).success).toBe(false);
  });

  it('should reject invalid status value', () => {
    expect(toggleAdminStatusSchema.safeParse({ status: 'SUSPENDED' }).success).toBe(false);
  });

  it('should reject SCHEDULED or other appointment statuses', () => {
    expect(toggleAdminStatusSchema.safeParse({ status: 'SCHEDULED' }).success).toBe(false);
  });
});