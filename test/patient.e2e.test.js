import request from 'supertest';
import { createApp } from '../src/app.js';
import bcrypt from 'bcryptjs';
import prisma, { connectDB } from '../src/config/database.js';

let app;
let adminToken;
let doctorToken;
let createdPatientId;

beforeAll(async () => {
  await connectDB();
  app = createApp();

  const hashedPassword = await bcrypt.hash('123456', 10);
  const adminRole = await prisma.roles.findFirst({ where: { name: 'ADMIN' } });
  const doctorRole = await prisma.roles.findFirst({ where: { name: 'DOCTOR' } });

  if (!adminRole || !doctorRole) throw new Error('Roles no existen en la base de datos');

  await prisma.users.upsert({
    where: { email: 'admin@aura.com' },
    update: { password: hashedPassword, role_id: adminRole.id, is_active: true },
    create: { email: 'admin@aura.com', password: hashedPassword, role_id: adminRole.id },
  });

  await prisma.users.upsert({
    where: { email: 'doctor.patient.test@aura.com' },
    update: { password: hashedPassword, role_id: doctorRole.id, is_active: true },
    create: { email: 'doctor.patient.test@aura.com', password: hashedPassword, role_id: doctorRole.id },
  });

  const adminRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@aura.com', password: '123456' });
  adminToken = adminRes.body.data.token;

  const doctorRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'doctor.patient.test@aura.com', password: '123456' });
  doctorToken = doctorRes.body.data.token;
}, 30000);

afterAll(async () => {
  if (createdPatientId) {
    await prisma.patients.deleteMany({ where: { id: createdPatientId } }).catch(() => {});
  }
  await prisma.$disconnect();
});

describe('REQ-03 – Authorization', () => {
  it('should reject unauthenticated request (401)', async () => {
    const res = await request(app).post('/api/v1/patients').send({
      name: 'Test',
      documentNumber: '99999',
    });
    expect(res.statusCode).toBe(401);
  });

  it('should reject DOCTOR role for patient creation (401)', async () => {
    const res = await request(app)
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ name: 'Test', documentNumber: '99999' });
    expect(res.statusCode).toBe(401);
  });
});

describe('REQ-03 – Create patient', () => {
  it('should create a patient successfully (200)', async () => {
    const uniqueDoc = `TEST-${Date.now()}`;
    const res = await request(app)
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Paciente E2E Test',
        documentNumber: uniqueDoc,
        birthDate: '1990-01-15',
        phone: '+57 300 9999999',
        email: `paciente.e2e.${Date.now()}@test.com`,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.documentNumber).toBe(uniqueDoc);
    expect(res.body.data.isActive).toBe(true);
    createdPatientId = res.body.data.id;
  });

  it('should reject duplicate document number (409)', async () => {
    const uniqueDoc = `DUP-${Date.now()}`;
    await request(app)
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Primero', documentNumber: uniqueDoc });

    const res = await request(app)
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Segundo', documentNumber: uniqueDoc });

    expect(res.statusCode).toBe(409);
  });

  it('should reject missing required field documentNumber (400)', async () => {
    const res = await request(app)
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Sin documento' });

    expect(res.statusCode).toBe(400);
  });
});

describe('REQ-03 – Update patient', () => {
  it('should update patient phone (200)', async () => {
    if (!createdPatientId) return;

    const res = await request(app)
      .put(`/api/v1/patients/${createdPatientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ phone: '+57 320 1111111' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.phone).toBe('+57 320 1111111');
  });

  it('should return 404 for non-existent patient', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .put(`/api/v1/patients/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Nuevo nombre' });

    expect(res.statusCode).toBe(404);
  });

  it('should reject empty update body (400)', async () => {
    if (!createdPatientId) return;

    const res = await request(app)
      .put(`/api/v1/patients/${createdPatientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.statusCode).toBe(400);
  });
});

describe('REQ-03 – Patient status', () => {
  it('should inactivate patient without deleting history (200)', async () => {
    if (!createdPatientId) return;

    const res = await request(app)
      .patch(`/api/v1/patients/${createdPatientId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INACTIVE' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.isActive).toBe(false);

    const inDb = await prisma.patients.findUnique({ where: { id: createdPatientId } });
    expect(inDb).not.toBeNull();
    expect(inDb.is_active).toBe(false);
  });

  it('should re-activate patient (200)', async () => {
    if (!createdPatientId) return;

    const res = await request(app)
      .patch(`/api/v1/patients/${createdPatientId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.isActive).toBe(true);
  });

  it('should reject invalid status value (400)', async () => {
    if (!createdPatientId) return;

    const res = await request(app)
      .patch(`/api/v1/patients/${createdPatientId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DELETED' });

    expect(res.statusCode).toBe(400);
  });
});

describe('REQ-03 – List and get patients', () => {
  it('should list patients with pagination (200)', async () => {
    const res = await request(app)
      .get('/api/v1/patients?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('totalPages');
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it('should get a patient by id (200)', async () => {
    if (!createdPatientId) return;

    const res = await request(app)
      .get(`/api/v1/patients/${createdPatientId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe(createdPatientId);
  });
});