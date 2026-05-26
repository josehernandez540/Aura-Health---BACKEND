import prisma from '../../config/database.js';
import NotificationRepository from '../../domain/repositories/notification.repository.js';

class PrismaNotificationRepository extends NotificationRepository {
    async findReminderSent(appointmentId) {
        return prisma.notifications.findFirst({
            where: {
                entity_type: 'APPOINTMENT',
                entity_id: appointmentId,
                type: 'APPOINTMENT_REMINDER',
                status: 'SENT',
            },
        });
    }

    async create(data) {
        return prisma.notifications.create({
            data,
        });
    }

    async markAsSent(id) {
        return prisma.notifications.update({
            where: { id },
            data: {
                status: 'SENT',
                sent_at: new Date(),
                updated_at: new Date(),
            },
        });
    }

    async markAsFailed(id) {
        return prisma.notifications.update({
            where: { id },
            data: {
                status: 'FAILED',
                updated_at: new Date(),
            },
        });
    }
}

export default new PrismaNotificationRepository();  