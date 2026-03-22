import RoleRepository from '../../domain/repositories/role.repository.js';
import prisma from '../../config/database.js';
 
class PrismaRoleRepository extends RoleRepository {
  async findByName(name) {
    return prisma.roles.findFirst({
      where: { name },
    });
  }
}
 
export default PrismaRoleRepository;
 