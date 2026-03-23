class AppointmentRepository {
  async findById(id) {
    throw new Error('Method not implemented');
  }

  async findAll(options = {}) {
    throw new Error('Method not implemented');
  }

  async findConflict({ doctorId, date, startTime, endTime, excludeId }) {
    throw new Error('Method not implemented');
  }

  async create(data) {
    throw new Error('Method not implemented');
  }

  async updateStatus(id, status, performedBy) {
    throw new Error('Method not implemented');
  }
}

export default AppointmentRepository;