import { createAppointmentSchema } from '../src/presentation/middlewares/schemas/createAppointment.schema.js';
import { updateAppointmentStatusSchema } from '../src/presentation/middlewares/schemas/updateAppointmentStatus.schema.js';

const FUTURE_DATE = '2099-12-15';

const VALID = {
  doctorId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  patientId: '4fa85f64-5717-4562-b3fc-2c963f66afb7',
  date: FUTURE_DATE,
  startTime: '09:00',
  endTime: '09:30',
  notes: 'Revisión anual',
};

describe('createAppointmentSchema', () => {
  it('should accept a fully valid payload', () => {
    expect(createAppointmentSchema.safeParse(VALID).success).toBe(true);
  });

  it('should accept payload without optional notes', () => {
    const { notes, ...minimal } = VALID;
    expect(createAppointmentSchema.safeParse(minimal).success).toBe(true);
  });

  it('should reject missing doctorId', () => {
    const { doctorId, ...rest } = VALID;
    expect(createAppointmentSchema.safeParse(rest).success).toBe(false);
  });

  it('should reject invalid doctorId (not a UUID)', () => {
    const result = createAppointmentSchema.safeParse({ ...VALID, doctorId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('should reject missing patientId', () => {
    const { patientId, ...rest } = VALID;
    expect(createAppointmentSchema.safeParse(rest).success).toBe(false);
  });

  it('should reject missing date', () => {
    const { date, ...rest } = VALID;
    expect(createAppointmentSchema.safeParse(rest).success).toBe(false);
  });

  it('should reject a past date', () => {
    const result = createAppointmentSchema.safeParse({ ...VALID, date: '2000-01-01' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid date string', () => {
    const result = createAppointmentSchema.safeParse({ ...VALID, date: 'not-a-date' });
    expect(result.success).toBe(false);
  });

  it('should reject missing startTime', () => {
    const { startTime, ...rest } = VALID;
    expect(createAppointmentSchema.safeParse(rest).success).toBe(false);
  });

  it('should reject startTime with wrong format (no leading zero)', () => {
    const result = createAppointmentSchema.safeParse({ ...VALID, startTime: '9:00' });
    expect(result.success).toBe(false);
  });

  it('should reject startTime with seconds included', () => {
    const result = createAppointmentSchema.safeParse({ ...VALID, startTime: '09:00:00' });
    expect(result.success).toBe(false);
  });

  it('should reject missing endTime', () => {
    const { endTime, ...rest } = VALID;
    expect(createAppointmentSchema.safeParse(rest).success).toBe(false);
  });

  it('should reject endTime equal to startTime', () => {
    const result = createAppointmentSchema.safeParse({
      ...VALID,
      startTime: '09:00',
      endTime: '09:00',
    });
    expect(result.success).toBe(false);
  });

  it('should reject endTime earlier than startTime', () => {
    const result = createAppointmentSchema.safeParse({
      ...VALID,
      startTime: '10:00',
      endTime: '09:30',
    });
    expect(result.success).toBe(false);
  });

  it('should reject notes longer than 500 characters', () => {
    const result = createAppointmentSchema.safeParse({
      ...VALID,
      notes: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('endTime error path should point to endTime field', () => {
    const result = createAppointmentSchema.safeParse({
      ...VALID,
      startTime: '10:00',
      endTime: '09:00',
    });
    const issues = result.error?.issues ?? [];
    const paths = issues.map((i) => i.path.join('.'));
    expect(paths).toContain('endTime');
  });
});

describe('updateAppointmentStatusSchema', () => {
  it('should accept CANCELLED', () => {
    expect(updateAppointmentStatusSchema.safeParse({ status: 'CANCELLED' }).success).toBe(true);
  });

  it('should accept COMPLETED', () => {
    expect(updateAppointmentStatusSchema.safeParse({ status: 'COMPLETED' }).success).toBe(true);
  });

  it('should accept NO_SHOW', () => {
    expect(updateAppointmentStatusSchema.safeParse({ status: 'NO_SHOW' }).success).toBe(true);
  });

  it('should accept optional notes', () => {
    const result = updateAppointmentStatusSchema.safeParse({
      status: 'CANCELLED',
      notes: 'Paciente no se presentó',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing status', () => {
    expect(updateAppointmentStatusSchema.safeParse({}).success).toBe(false);
  });

  it('should reject invalid status value', () => {
    expect(
      updateAppointmentStatusSchema.safeParse({ status: 'SUSPENDED' }).success
    ).toBe(false);
  });

  it('should reject SCHEDULED as an update target', () => {
    expect(
      updateAppointmentStatusSchema.safeParse({ status: 'SCHEDULED' }).success
    ).toBe(false);
  });

  it('should reject notes longer than 500 characters', () => {
    const result = updateAppointmentStatusSchema.safeParse({
      status: 'CANCELLED',
      notes: 'y'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});