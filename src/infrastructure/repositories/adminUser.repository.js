import prisma from '../../config/database.js';
import AdminUserRepository from '../../domain/repositories/adminUser.repository.js';

class PrismaAdminUserRepository extends AdminUserRepository {
  async findAll({ page = 1, limit = 20, search = '' } = {}) {
    const skip = (page - 1) * limit;

    const adminRole = await prisma.roles.findFirst({ where: { name: 'ADMIN' } });
    if (!adminRole) return { items: [], total: 0, page, limit, totalPages: 0 };

    const where = {
      role_id: adminRole.id,
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.users.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          email: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          doctors: {
            select: { name: true },
          },
          roles: { select: { name: true } },
        },
      }),
      prisma.users.count({ where }),
    ]);

    return {
      items: items.map((u) => this._mapRow(u)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id) {
    const user = await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        roles: { select: { name: true } },
      },
    });

    if (!user || user.roles.name !== 'ADMIN') return null;
    return this._mapRow(user);
  }

  async findByEmail(email) {
    return prisma.users.findUnique({
      where: { email },
      include: { roles: true },
    });
  }

  async create({ email, password, name }) {
    const adminRole = await prisma.roles.findFirst({ where: { name: 'ADMIN' } });
    if (!adminRole) throw new Error('Rol ADMIN no existe en el sistema');

    const user = await prisma.users.create({
      data: {
        email,
        password,
        role_id: adminRole.id,
        is_active: true,
        must_change_password: true,
      },
      select: {
        id: true,
        email: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        roles: { select: { name: true } },
      },
    });

    return this._mapRow(user);
  }

  async update(id, { email }) {
    const user = await prisma.users.update({
      where: { id },
      data: {
        ...(email !== undefined && { email }),
        updated_at: new Date(),
      },
      select: {
        id: true,
        email: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        roles: { select: { name: true } },
      },
    });

    return this._mapRow(user);
  }

  async updateStatus(id, isActive) {
    const user = await prisma.users.update({
      where: { id },
      data: {
        is_active: isActive,
        updated_at: new Date(),
      },
      select: {
        id: true,
        email: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        roles: { select: { name: true } },
      },
    });

    return this._mapRow(user);
  }

  async countActiveAdmins() {
    const adminRole = await prisma.roles.findFirst({ where: { name: 'ADMIN' } });
    if (!adminRole) return 0;

    return prisma.users.count({
      where: { role_id: adminRole.id, is_active: true },
    });
  }

  _mapRow(user) {
    return {
      id: user.id,
      email: user.email,
      name: user.doctors?.name ?? null,
      role: user.roles?.name ?? 'ADMIN',
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}

export default PrismaAdminUserRepository;