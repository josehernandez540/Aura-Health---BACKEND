import request from 'supertest';
import { createApp } from '../src/app.js';
import bcrypt from 'bcryptjs';
import prisma, { connectDB } from '../src/config/database.js';


let app;
let doctorToken = null;
let adminToken = null;


beforeAll(async () => {
  await connectDB(); 
  app = createApp();

  const role = await prisma.roles.findFirst({
    where: { name: 'DOCTOR' },
  });

  if (!role) {
    throw new Error('Role DOCTOR no existe en la base de datos');
  }

  const hashedPassword = await bcrypt.hash('123456', 10);

  await prisma.users.upsert({
    where: { email: 'doctor@aura.com' },
    update: {
      password: hashedPassword,
      role_id: role.id,
    },
    create: {
      email: 'doctor@aura.com',
      password: hashedPassword,
      role_id: role.id,
    },
  });

  const adminRole = await prisma.roles.findFirst({
    where: { name: 'ADMIN' },
  });

  await prisma.users.upsert({
    where: { email: 'admin@aura.com' },
    update: {
      password: hashedPassword,
      role_id: adminRole.id,
    },
    create: {
      email: 'admin@aura.com',
      password: hashedPassword,
      role_id: adminRole.id,
    },
  });
});


afterAll(async () => {
  await prisma.$disconnect();
});

describe('Auth flow', () => {

  it('should fail login with wrong credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'wrong@test.com',
        password: 'badpassword',
      });

    expect(res.statusCode).toBe(401);
  });

  it('should login doctor successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'doctor@aura.com',
        password: '123456',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.token).toBeDefined();

    doctorToken = res.body.data.token;
  });

  it('should login admin successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@aura.com',
        password: '123456',
      });

    expect(res.statusCode).toBe(200);
    adminToken = res.body.data.token;
  });

});

describe('Protected routes', () => {

  it('should fail without token', async () => {
    const res = await request(app)
      .get('/api/v1/protected');

    expect(res.statusCode).toBe(401);
  });

  it('should allow access with valid token', async () => {
    const res = await request(app)
      .get('/api/v1/protected')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should allow ADMIN access', async () => {
    const res = await request(app)
      .get('/api/v1/admin/info')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
  });

});