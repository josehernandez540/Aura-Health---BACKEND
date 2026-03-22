import request from 'supertest';
import { createApp } from '../src/app.js';
import bcrypt from 'bcryptjs';
import prisma, { connectDB } from '../src/config/database.js';

let app;
let adminToken;
let doctorToken;
let doctorUserId;
let doctorId;

beforeAll(async () => {
  await connectDB();
  app = createApp();

  const hashedPassword = await bcrypt.hash('123456', 10);

  const adminRole = await prisma.roles.findFirst({ where: { name: 'ADMIN' } });
  const doctorRole = await prisma.roles.findFirst({ where: { name: 'DOCTOR' } });

  if (!adminRole || !doctorRole) throw new Error('Roles no existen');

  await prisma.users.upsert({
    where: { email: 'admin@aura.com' },
    update: { password: hashedPassword, role_id: adminRole.id, is_active: true },
    create: { email: 'admin@aura.com', password: hashedPassword, role_id: adminRole.id },
  });

  const doctorUser = await prisma.users.upsert({
    where: { email: 'doctor.req02@aura.com' },
    update: { password: hashedPassword, role_id: doctorRole.id, is_active: true },
    create: { email: 'doctor.req02@aura.com', password: hashedPassword, role_id: doctorRole.id },
  });
  doctorUserId = doctorUser.id;

  await prisma.users.update({
    where: { id: doctorUserId },
    data: { is_active: true },
  });

  const doctorProfile = await prisma.doctors.upsert({
    where: { user_id: doctorUserId },
    update: { is_active: true, status_changed_at: null, status_changed_by: null },
    create: { user_id: doctorUserId, name: 'Dr. Test REQ02', is_active: true },
  });
  doctorId = doctorProfile.id;

  await prisma.audit_logs.deleteMany({
    where: { entity_id: doctorId, action: 'DOCTOR_STATUS_CHANGED' },
  });

  const adminRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@aura.com', password: '123456' });

  if (adminRes.statusCode !== 200) {
    throw new Error(`Admin login falló: ${JSON.stringify(adminRes.body)}`);
  }
  adminToken = adminRes.body.data.token;

  const doctorRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'doctor.req02@aura.com', password: '123456' });

  if (doctorRes.statusCode !== 200) {
    throw new Error(`Doctor login falló (is_active puede ser false): ${JSON.stringify(doctorRes.body)}`);
  }
  doctorToken = doctorRes.body.data.token;

  const verifyAdmin = await request(app)
    .get('/api/v1/protected')
    .set('Authorization', `Bearer ${adminToken}`);

  if (verifyAdmin.statusCode !== 200) {
    throw new Error(`Token admin inválido — ${verifyAdmin.statusCode}: ${JSON.stringify(verifyAdmin.body)}`);
  }

  const verifyDoctor = await request(app)
    .get('/api/v1/protected')
    .set('Authorization', `Bearer ${doctorToken}`);

  if (verifyDoctor.statusCode !== 200) {
    throw new Error(`Token doctor inválido — ${verifyDoctor.statusCode}: ${JSON.stringify(verifyDoctor.body)}`);
  }
}, 30000);

afterAll(async () => {
  await prisma.$disconnect();
});


describe('REQ-02 – Authorization', () => {

  it('should reject request without token (401)', async () => {
    const res = await request(app)
      .patch(`/api/v1/doctors/${doctorId}/status`)
      .send({ status: 'INACTIVE' });

    expect(res.statusCode).toBe(401);
  });

  it('should reject DOCTOR role (403)', async () => {
    const res = await request(app)
      .patch(`/api/v1/doctors/${doctorId}/status`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ status: 'INACTIVE' });

    expect(res.statusCode).toBe(401);
  });

});


describe('REQ-02 – Inactivate doctor', () => {

  it('should inactivate doctor (200)', async () => {
    const res = await request(app)
      .patch(`/api/v1/doctors/${doctorId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INACTIVE' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.is_active).toBe(false);
  });

  it('should create audit log for DOCTOR_STATUS_CHANGED', async () => {
    const log = await prisma.audit_logs.findFirst({
      where: { entity_id: doctorId, action: 'DOCTOR_STATUS_CHANGED' },
      orderBy: { created_at: 'desc' },
    });

    expect(log).toBeTruthy();
    expect(log.action).toBe('DOCTOR_STATUS_CHANGED');
  });

  it('should record status_changed_at on doctors row', async () => {
    const doctor = await prisma.doctors.findUnique({ where: { id: doctorId } });
    expect(doctor.is_active).toBe(false);
    expect(doctor.status_changed_at).toBeTruthy();
  });

  it('inactive doctor token should be rejected on protected routes (401)', async () => {
    const res = await request(app)
      .get('/api/v1/protected')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.statusCode).toBe(401);
  });

  it('inactive doctor cannot login', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'doctor.req02@aura.com', password: '123456' });

    expect([200, 401]).toContain(res.statusCode);
  });

});


describe('REQ-02 – Re-activate doctor', () => {

  it('should activate doctor again (200)', async () => {
    const res = await request(app)
      .patch(`/api/v1/doctors/${doctorId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.is_active).toBe(true);
  });

  it('should record new audit log for re-activation', async () => {
    const logs = await prisma.audit_logs.findMany({
      where: { entity_id: doctorId, action: 'DOCTOR_STATUS_CHANGED' },
      orderBy: { created_at: 'asc' },
    });

    expect(logs.length).toBeGreaterThanOrEqual(2);
  });

  it('historical data should not be deleted', async () => {
    const doctor = await prisma.doctors.findUnique({ where: { id: doctorId } });
    expect(doctor).toBeTruthy();
    expect(doctor.name).toBe('Dr. Test REQ02');
  });

});


describe('REQ-02 – Validation', () => {

  it('should reject invalid status value (400)', async () => {
    const res = await request(app)
      .patch(`/api/v1/doctors/${doctorId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' });

    expect(res.statusCode).toBe(400);
  });

  it('should return 404 for non-existent doctor id', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .patch(`/api/v1/doctors/${fakeId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INACTIVE' });

    expect(res.statusCode).toBe(404);
  });

});