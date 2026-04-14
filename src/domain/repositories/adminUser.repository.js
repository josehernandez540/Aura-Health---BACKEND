class AdminUserRepository {
  async findAll(options = {}) {
    throw new Error('Method not implemented');
  }

  async findById(id) {
    throw new Error('Method not implemented');
  }

  async findByEmail(email) {
    throw new Error('Method not implemented');
  }

  async create(data) {
    throw new Error('Method not implemented');
  }

  async update(id, data) {
    throw new Error('Method not implemented');
  }

  async updateStatus(id, isActive) {
    throw new Error('Method not implemented');
  }

  async countActiveAdmins() {
    throw new Error('Method not implemented');
  }
}

export default AdminUserRepository;