import request from 'supertest';
import { createApp } from '../src/app.js';
import bcrypt from 'bcryptjs';
import prisma, { connectDB } from '../src/config/database.js';

let app;
let adminToken;
let doctorToken;
let createdAdminId;

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
    where: { email: 'doctor.admintest@aura.com' },
    update: { password: hashedPassword, role_id: doctorRole.id, is_active: true },
    create: { email: 'doctor.admintest@aura.com', password: hashedPassword, role_id: doctorRole.id },
  });

  const adminRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@aura.com', password: '123456' });
  adminToken = adminRes.body.data.token;

  const doctorRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'doctor.admintest@aura.com', password: '123456' });
  doctorToken = doctorRes.body.data.token;
}, 30000);

afterAll(async () => {
  if (createdAdminId) {
    await prisma.users.deleteMany({ where: { id: createdAdminId } }).catch(() => {});
  }
  await prisma.$disconnect();
});

describe('Admin Users – Authorization', () => {
  it('should reject unauthenticated request (401)', async () => {
    const res = await request(app).get('/api/v1/admin');
    expect(res.statusCode).toBe(401);
  });

  it('should reject DOCTOR role (403)', async () => {
    const res = await request(app)
      .get('/api/v1/admin')
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(res.statusCode).toBe(403);
  });
});

describe('Admin Users – List', () => {
  it('should list admin users with pagination (200)', async () => {
    const res = await request(app)
      .get('/api/v1/admin?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('totalPages');
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it('each item should have required fields', async () => {
    const res = await request(app)
      .get('/api/v1/admin')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    if (res.body.data.items.length > 0) {
      const item = res.body.data.items[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('email');
      expect(item).toHaveProperty('isActive');
      expect(item).toHaveProperty('role');
    }
  });
});

describe('Admin Users – Create', () => {
  it('should create a new admin user (200)', async () => {
    const uniqueEmail = `admin.e2e.${Date.now()}@aura.com`;

    const res = await request(app)
      .post('/api/v1/admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: uniqueEmail, name: 'Admin E2E Test' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(uniqueEmail);
    expect(res.body.data.role).toBe('ADMIN');
    expect(res.body.data.isActive).toBe(true);

    createdAdminId = res.body.data.id;
  });

  it('should reject duplicate email (409)', async () => {
    const res = await request(app)
      .post('/api/v1/admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'admin@aura.com', name: 'Duplicado' });

    expect(res.statusCode).toBe(409);
  });

  it('should reject missing email (400)', async () => {
    const res = await request(app)
      .post('/api/v1/admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Sin email' });

    expect(res.statusCode).toBe(400);
  });

  it('should reject invalid email format (400)', async () => {
    const res = await request(app)
      .post('/api/v1/admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'not-an-email', name: 'Test' });

    expect(res.statusCode).toBe(400);
  });

  it('should reject DOCTOR role creating admin (403)', async () => {
    const res = await request(app)
      .post('/api/v1/admin')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ email: 'hacker@aura.com', name: 'Hacker' });

    expect(res.statusCode).toBe(403);
  });
});

describe('Admin Users – Get by ID', () => {
  it('should return admin by id (200)', async () => {
    if (!createdAdminId) return;

    const res = await request(app)
      .get(`/api/v1/admin/${createdAdminId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe(createdAdminId);
  });

  it('should return 404 for non-existent admin', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .get(`/api/v1/admin/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
  });
});

describe('Admin Users – Update', () => {
  it('should update admin email (200)', async () => {
    if (!createdAdminId) return;

    const newEmail = `admin.updated.${Date.now()}@aura.com`;
    const res = await request(app)
      .put(`/api/v1/admin/${createdAdminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: newEmail });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.email).toBe(newEmail);
  });

  it('should reject empty update body (400)', async () => {
    if (!createdAdminId) return;

    const res = await request(app)
      .put(`/api/v1/admin/${createdAdminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  it('should return 404 for non-existent admin', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .put(`/api/v1/admin/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'nuevo@aura.com' });

    expect(res.statusCode).toBe(404);
  });
});

describe('Admin Users – Toggle Status', () => {
  it('should inactivate admin user (200)', async () => {
    if (!createdAdminId) return;

    const res = await request(app)
      .patch(`/api/v1/admin/${createdAdminId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INACTIVE' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it('should re-activate admin user (200)', async () => {
    if (!createdAdminId) return;

    const res = await request(app)
      .patch(`/api/v1/admin/${createdAdminId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.isActive).toBe(true);
  });

  it('should reject invalid status value (400)', async () => {
    if (!createdAdminId) return;

    const res = await request(app)
      .patch(`/api/v1/admin/${createdAdminId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DELETED' });

    expect(res.statusCode).toBe(400);
  });

  it('should reject self-deactivation (400)', async () => {

    const adminUser = await prisma.users.findUnique({ where: { email: 'admin@aura.com' } });
    if (!adminUser) return;

    const res = await request(app)
      .patch(`/api/v1/admin/${adminUser.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INACTIVE' });

    expect(res.statusCode).toBe(400);
  });

  it('should return 404 for non-existent admin', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .patch(`/api/v1/admin/${fakeId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INACTIVE' });

    expect(res.statusCode).toBe(404);
  });
});