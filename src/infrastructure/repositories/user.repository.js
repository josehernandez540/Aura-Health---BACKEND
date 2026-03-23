import prisma from '../../config/database.js';
import UserRepository from '../../domain/repositories/user.repository.js';


class PrismaUserRepository extends UserRepository {
  async findByEmail(email) {
    return prisma.users.findUnique({
      where: { email },
      include: { roles: true },
    });
  }

  async findById(id) {
    return prisma.users.findUnique({
      where: { id },
      include: { roles: true },
    });
  }

  async createWithDoctor({
    email,
    password,
    roleId,
    name,
    documentNumber,
    specialization,
    licenseNumber,
    phone,
  }) {
    return prisma.$transaction(async (tx) => {
      
      const user = await tx.users.create({
        data: {
          email,
          password,
          role_id: roleId,
          must_change_password: true,
        },
      });
 
      const doctor = await tx.doctors.create({
        data: {
          user_id: user.id,
          name,
          specialization: specialization ?? null,
          license_number: licenseNumber ?? null,
          is_active: true,
        },
      });
 
      await tx.patients.create({
        data: {
          name,
          document_number: documentNumber,
          phone: phone ?? null,
          email,
          is_active: true,
        },
      });
 
      return { user, doctor };
    });
  }

  async updatePassword(id, hashedPassword) {
    return prisma.users.update({
      where: { id },
      data: {
        password: hashedPassword,
        must_change_password: false,
        updated_at: new Date(),
      },
    });
  }
}

export default PrismaUserRepository;