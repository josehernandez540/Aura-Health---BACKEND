import notificationRepository from '../../infrastructure/repositories/notification.repository.js';
import { successResponse } from '../../shared/utils/apiResponse.js';

const STREAM_POLL_INTERVAL_MS = 5000;

const formatNotification = (n) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    status: n.status,
    entityType: n.entity_type,
    entityId: n.entity_id,
    isRead: !!n.read_at,
    sentAt: n.sent_at,
    createdAt: n.created_at,
});

class NotificationController {
    async list(req, res, next) {
        try {
            const { page = 1, limit = 20 } = req.query;
            const userId = req.user.userId;

            const result = await notificationRepository.findByUser(userId, {
                page: Number(page),
                limit: Math.min(Number(limit), 100),
            });

            return successResponse(res, {
                ...result,
                items: result.items.map(formatNotification),
            });
        } catch (error) {
            next(error);
        }
    }

    async unreadCount(req, res, next) {
        try {
            const count = await notificationRepository.countUnread(req.user.userId);
            return successResponse(res, { count });
        } catch (error) {
            next(error);
        }
    }

    async markAsRead(req, res, next) {
        try {
            const { id } = req.params;
            await notificationRepository.markAsRead(id, req.user.userId);
            return successResponse(res, null, 'Notificación marcada como leída');
        } catch (error) {
            next(error);
        }
    }

    async markAllAsRead(req, res, next) {
        try {
            await notificationRepository.markAllAsRead(req.user.userId);
            return successResponse(res, null, 'Notificaciones marcadas como leídas');
        } catch (error) {
            next(error);
        }
    }

    async stream(req, res, next) {
        try {
            const userId = req.user.userId;

            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');
            res.flushHeaders();

            let lastCheck = new Date();

            const poll = async () => {
                try {
                    const fresh = await notificationRepository.findNewerThan(userId, lastCheck);

                    if (fresh.length > 0) {
                        // +1ms guards against re-matching the same row: Postgres timestamps
                        // can carry sub-millisecond precision that a JS Date truncates, so
                        // reusing the row's own created_at as the next cursor could satisfy
                        // "gt" again on the following poll.
                        lastCheck = new Date(fresh[fresh.length - 1].created_at.getTime() + 1);
                        for (const notification of fresh) {
                            res.write(`event: notification\ndata: ${JSON.stringify(formatNotification(notification))}\n\n`);
                        }
                    } else {
                        res.write(': heartbeat\n\n');
                    }
                } catch (error) {
                    res.write(': heartbeat\n\n');
                }
            };

            const interval = setInterval(poll, STREAM_POLL_INTERVAL_MS);

            req.on('close', () => {
                clearInterval(interval);
                res.end();
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new NotificationController();
