class NotificationRepository {
  async findReminderSent(appointmentId) {
    throw new Error('Method not implemented');
  }

  async create(data) {
    throw new Error('Method not implemented');
  }

  async markAsSent(id) {
    throw new Error('Method not implemented');
  }

  async markAsFailed(id) {
    throw new Error('Method not implemented');
  }

  async findByUser(userId, { page, limit } = {}) {
    throw new Error('Method not implemented');
  }

  async findNewerThan(userId, since) {
    throw new Error('Method not implemented');
  }

  async countUnread(userId) {
    throw new Error('Method not implemented');
  }

  async markAsRead(id, userId) {
    throw new Error('Method not implemented');
  }

  async markAllAsRead(userId) {
    throw new Error('Method not implemented');
  }
}

export default NotificationRepository;