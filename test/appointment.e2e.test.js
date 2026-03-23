import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import prisma, { connectDB } from '../src/config/database.js';

let app;
let adminToken;
let doctorToken;
let doctorId;
let patientId;
let createdAppointmentId;

const FUTURE_DATE      = '2099-11-20';   
const FUTURE_DATE_CONC = '2099-11-21';

const START_TIME = '10:00';
const END_TIME   = '10:30';


beforeAll(async () => {
  await connectDB();
  app = createApp();

  const hashedPwd = await bcrypt.hash('123456', 10);
  const adminRole  = await prisma.roles.findFirst({ where: { name: 'ADMIN'  } });
  const doctorRole = await prisma.roles.findFirst({ where: { name: 'DOCTOR' } });

  if (!adminRole || !doctorRole) throw new Error('Roles ADMIN / DOCTOR no existen');

  await prisma.users.upsert({
    where:  { email: 'admin@aura.com' },
    update: { password: hashedPwd, role_id: adminRole.id, is_active: true },
    create: { email: 'admin@aura.com', password: hashedPwd, role_id: adminRole.id },
  });

  const doctorUser = await prisma.users.upsert({
    where:  { email: 'doctor.req04@aura.com' },
    update: { password: hashedPwd, role_id: doctorRole.id, is_active: true },
    create: { email: 'doctor.req04@aura.com', password: hashedPwd, role_id: doctorRole.id },
  });

  const doctorProfile = await prisma.doctors.upsert({
    where:  { user_id: doctorUser.id },
    update: { is_active: true, name: 'Dr. REQ04' },
    create: { user_id: doctorUser.id, name: 'Dr. REQ04', is_active: true },
  });
  doctorId = doctorProfile.id;

  const docNum = `REQ04-${Date.now()}`;
  const patient = await prisma.patients.upsert({
    where:  { document_number: docNum },
    update: { is_active: true },
    create: { name: 'Paciente REQ04', document_number: docNum, is_active: true },
  });
  patientId = patient.id;

  const oldAppts = await prisma.appointments.findMany({
    where: { doctor_id: doctorId, date: { in: [new Date(FUTURE_DATE), new Date(FUTURE_DATE_CONC)] } },
    select: { id: true },
  });
  if (oldAppts.length > 0) {
    await prisma.appointment_history.deleteMany({
      where: { appointment_id: { in: oldAppts.map(a => a.id) } },
    });
  }
  await prisma.appointments.deleteMany({
    where: {
      doctor_id: doctorId,
      date: { in: [new Date(FUTURE_DATE), new Date(FUTURE_DATE_CONC)] },
    },
  });

  const adminRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@aura.com', password: '123456' });
  if (adminRes.statusCode !== 200) throw new Error(`Admin login failed: ${JSON.stringify(adminRes.body)}`);
  adminToken = adminRes.body.data.token;

  const doctorRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'doctor.req04@aura.com', password: '123456' });
  if (doctorRes.statusCode !== 200) throw new Error(`Doctor login failed: ${JSON.stringify(doctorRes.body)}`);
  doctorToken = doctorRes.body.data.token;
}, 30000);

afterAll(async () => {
  await prisma.$disconnect();
});

describe('REQ-04 – Authorization', () => {
  it('should reject unauthenticated request (401)', async () => {
    const res = await request(app)
      .post('/api/v1/appointments')
      .send({ doctorId, patientId, date: FUTURE_DATE, startTime: START_TIME, endTime: END_TIME });

    expect(res.statusCode).toBe(401);
  });

  it('should reject DOCTOR role for appointment creation (401)', async () => {
    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ doctorId, patientId, date: FUTURE_DATE, startTime: START_TIME, endTime: END_TIME });

    expect(res.statusCode).toBe(401);
  });

  it('should allow ADMIN to list appointments', async () => {
    const res = await request(app)
      .get('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
  });

  it('should allow DOCTOR to list appointments (read-only)', async () => {
    const res = await request(app)
      .get('/api/v1/appointments')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.statusCode).toBe(200);
  });
});

describe('REQ-04 – Input validation', () => {
  it('should reject past date (400)', async () => {
    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ doctorId, patientId, date: '2000-01-01', startTime: '09:00', endTime: '09:30' });

    expect(res.statusCode).toBe(400);
  });

  it('should reject endTime equal to startTime (400)', async () => {
    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ doctorId, patientId, date: FUTURE_DATE, startTime: '09:00', endTime: '09:00' });

    expect(res.statusCode).toBe(400);
  });

  it('should reject endTime before startTime (400)', async () => {
    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ doctorId, patientId, date: FUTURE_DATE, startTime: '10:00', endTime: '09:00' });

    expect(res.statusCode).toBe(400);
  });

  it('should reject missing patientId (400)', async () => {
    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ doctorId, date: FUTURE_DATE, startTime: '09:00', endTime: '09:30' });

    expect(res.statusCode).toBe(400);
  });

  it('should reject non-UUID doctorId (400)', async () => {
    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ doctorId: 'not-a-uuid', patientId, date: FUTURE_DATE, startTime: '09:00', endTime: '09:30' });

    expect(res.statusCode).toBe(400);
  });

  it('should return 404 for non-existent doctor', async () => {
    const fakeId = 'a1b2c3d4-1111-4000-8000-000000000001';
    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ doctorId: fakeId, patientId, date: FUTURE_DATE, startTime: '09:00', endTime: '09:30' });

    expect(res.statusCode).toBe(404);
  });

  it('should return 404 for non-existent patient', async () => {
    const fakeId = 'a1b2c3d4-2222-4000-8000-000000000002';
    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ doctorId, patientId: fakeId, date: FUTURE_DATE, startTime: '09:00', endTime: '09:30' });

    expect(res.statusCode).toBe(404);
  });
});

describe('REQ-04 – Create appointment (happy path)', () => {
  it('should create appointment and return confirmation (200)', async () => {
    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        doctorId,
        patientId,
        date: FUTURE_DATE,
        startTime: START_TIME,
        endTime: END_TIME,
        notes: 'Revisión anual REQ-04',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.confirmationId).toBeDefined();
    expect(data.status).toBe('SCHEDULED');
    expect(data.message).toMatch(/Cita confirmada/);
    expect(data.doctor).toBeDefined();
    expect(data.doctor.id).toBe(doctorId);
    expect(data.patient).toBeDefined();
    expect(data.patient.id).toBe(patientId);
    expect(data.appointment).toBeDefined();
    expect(data.appointment.startTime).toBe(START_TIME);
    expect(data.appointment.endTime).toBe(END_TIME);

    createdAppointmentId = data.confirmationId;
  });

  it('should persist appointment in the database', async () => {
    expect(createdAppointmentId).toBeDefined();
    const row = await prisma.appointments.findUnique({ where: { id: createdAppointmentId } });
    expect(row).not.toBeNull();
    expect(row.status).toBe('SCHEDULED');
    expect(row.doctor_id).toBe(doctorId);
    expect(row.patient_id).toBe(patientId);
  });

  it('should create an audit log for APPOINTMENT_CREATED', async () => {
    const log = await prisma.audit_logs.findFirst({
      where: { action: 'APPOINTMENT_CREATED', entity_id: createdAppointmentId },
    });
    expect(log).toBeTruthy();
    expect(log.action).toBe('APPOINTMENT_CREATED');
  });
});

describe('REQ-04 – Availability validation', () => {
  it('should reject exact duplicate slot (409)', async () => {
    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ doctorId, patientId, date: FUTURE_DATE, startTime: START_TIME, endTime: END_TIME });

    expect(res.statusCode).toBe(409);
  });

  it('should reject partially overlapping slot — starts before, ends inside (409)', async () => {
    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ doctorId, patientId, date: FUTURE_DATE, startTime: '09:45', endTime: '10:15' });

    expect(res.statusCode).toBe(409);
  });

  it('should reject partially overlapping slot — starts inside, ends after (409)', async () => {
    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ doctorId, patientId, date: FUTURE_DATE, startTime: '10:15', endTime: '10:45' });

    expect(res.statusCode).toBe(409);
  });

  it('should reject completely contained slot (409)', async () => {
    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ doctorId, patientId, date: FUTURE_DATE, startTime: '10:05', endTime: '10:25' });

    expect(res.statusCode).toBe(409);
  });

  it('conflict error message should reference the blocking slot times', async () => {
    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ doctorId, patientId, date: FUTURE_DATE, startTime: START_TIME, endTime: END_TIME });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(START_TIME);
  });

  it('should allow an adjacent slot immediately after (200)', async () => {
    // END_TIME = '10:30' → 10:30–11:00 must be free
    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ doctorId, patientId, date: FUTURE_DATE, startTime: '10:30', endTime: '11:00' });

    expect(res.statusCode).toBe(200);

    if (res.body.data?.confirmationId) {
      const id = res.body.data.confirmationId;
      await prisma.appointment_history.deleteMany({ where: { appointment_id: id } }).catch(() => {});
      await prisma.appointments.deleteMany({ where: { id } }).catch(() => {});
    }
  });

  it('should allow an adjacent slot immediately before (200)', async () => {
    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ doctorId, patientId, date: FUTURE_DATE, startTime: '09:00', endTime: '10:00' });

    expect(res.statusCode).toBe(200);

    if (res.body.data?.confirmationId) {
      const id = res.body.data.confirmationId;
      await prisma.appointment_history.deleteMany({ where: { appointment_id: id } }).catch(() => {});
      await prisma.appointments.deleteMany({ where: { id } }).catch(() => {});
    }
  });
});


describe('REQ-04 – Concurrency', () => {
  it('should allow only one of two simultaneous requests for the same slot', async () => {
    const CONC_START = '14:00';
    const CONC_END   = '14:30';

    const concOldAppts = await prisma.appointments.findMany({
      where: { doctor_id: doctorId, date: new Date(FUTURE_DATE_CONC) },
      select: { id: true },
    });
    if (concOldAppts.length > 0) {
      await prisma.appointment_history.deleteMany({
        where: { appointment_id: { in: concOldAppts.map(a => a.id) } },
      });
    }
    await prisma.appointments.deleteMany({
      where: { doctor_id: doctorId, date: new Date(FUTURE_DATE_CONC) },
    });

    const payload = {
      doctorId,
      patientId,
      date: FUTURE_DATE_CONC,
      startTime: CONC_START,
      endTime: CONC_END,
    };

    const [res1, res2] = await Promise.all([
      request(app).post('/api/v1/appointments').set('Authorization', `Bearer ${adminToken}`).send(payload),
      request(app).post('/api/v1/appointments').set('Authorization', `Bearer ${adminToken}`).send(payload),
    ]);

    const statuses = [res1.statusCode, res2.statusCode].sort();

    expect(statuses).toEqual([200, 409]);

    const successful = res1.statusCode === 200 ? res1 : res2;
    const concId = successful.body.data?.confirmationId;
    if (concId) {
      await prisma.appointment_history.deleteMany({ where: { appointment_id: concId } }).catch(() => {});
      await prisma.appointments.deleteMany({ where: { id: concId } }).catch(() => {});
    }
  });
});

describe('REQ-04 – Update appointment status', () => {
  it('should cancel the appointment (200)', async () => {
    expect(createdAppointmentId).toBeDefined();

    const res = await request(app)
      .patch(`/api/v1/appointments/${createdAppointmentId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CANCELLED' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
  });

  it('should create audit log for APPOINTMENT_CANCELLED', async () => {
    const log = await prisma.audit_logs.findFirst({
      where: { action: 'APPOINTMENT_CANCELLED', entity_id: createdAppointmentId },
    });
    expect(log).toBeTruthy();
  });

  it('should reject transition from CANCELLED to COMPLETED (400)', async () => {
    const res = await request(app)
      .patch(`/api/v1/appointments/${createdAppointmentId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'COMPLETED' });

    expect(res.statusCode).toBe(400);
  });

  it('should return 404 for non-existent appointment', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000099';
    const res = await request(app)
      .patch(`/api/v1/appointments/${fakeId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CANCELLED' });

    expect(res.statusCode).toBe(404);
  });

  it('should reject invalid status value (400)', async () => {
    const res = await request(app)
      .patch(`/api/v1/appointments/${createdAppointmentId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DELETED' });

    expect(res.statusCode).toBe(400);
  });
});

describe('REQ-04 – List and retrieve appointments', () => {
  it('should list appointments with pagination (200)', async () => {
    const res = await request(app)
      .get('/api/v1/appointments?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('totalPages');
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it('should filter by doctorId', async () => {
    const res = await request(app)
      .get(`/api/v1/appointments?doctorId=${doctorId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
  });

  it('should get appointment by id (200)', async () => {
    expect(createdAppointmentId).toBeDefined();

    const res = await request(app)
      .get(`/api/v1/appointments/${createdAppointmentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe(createdAppointmentId);
  });

  it('should return 404 for non-existent appointment id', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000088';
    const res = await request(app)
      .get(`/api/v1/appointments/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
  });
});