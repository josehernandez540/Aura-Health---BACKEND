import prisma from '../../config/database.js';


class PrismaUserRepository {
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
}

export default PrismaUserRepository;