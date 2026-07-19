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

    async findByUser(userId, { page = 1, limit = 20 } = {}) {
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            prisma.notifications.findMany({
                where: { user_id: userId },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
            }),
            prisma.notifications.count({ where: { user_id: userId } }),
        ]);

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findNewerThan(userId, since) {
        return prisma.notifications.findMany({
            where: {
                user_id: userId,
                created_at: { gt: since },
            },
            orderBy: { created_at: 'asc' },
        });
    }

    async countUnread(userId) {
        return prisma.notifications.count({
            where: { user_id: userId, read_at: null },
        });
    }

    async markAsRead(id, userId) {
        return prisma.notifications.updateMany({
            where: { id, user_id: userId },
            data: { read_at: new Date(), updated_at: new Date() },
        });
    }

    async markAllAsRead(userId) {
        return prisma.notifications.updateMany({
            where: { user_id: userId, read_at: null },
            data: { read_at: new Date(), updated_at: new Date() },
        });
    }
}

export default new PrismaNotificationRepository();  