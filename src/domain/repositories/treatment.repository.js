class TreatmentRepository {
  async findById(id) {
    throw new Error('Method not implemented');
  }

  async findAll(options = {}) {
    throw new Error('Method not implemented');
  }

  async findByPatientId(patientId, options = {}) {
    throw new Error('Method not implemented');
  }

  async create(data) {
    throw new Error('Method not implemented');
  }

  async update(id, data) {
    throw new Error('Method not implemented');
  }

  async updateStatus(id, status) {
    throw new Error('Method not implemented');
  }
  
  async approve(id, approvedBy, notes) {
    throw new Error('Method not implemented');
  }
}

export default TreatmentRepository;