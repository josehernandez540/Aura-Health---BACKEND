import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import sseAuthMiddleware from '../middlewares/sseAuth.middleware.js';
import notificationController from '../controllers/notification.controller.js';

const notificationRouter = express.Router();

/**
 * @openapi
 * /v1/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Listar notificaciones del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Lista paginada de notificaciones
 */
notificationRouter.get('/', authMiddleware, (req, res, next) =>
  notificationController.list(req, res, next)
);

/**
 * @openapi
 * /v1/notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Cantidad de notificaciones no leídas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conteo de no leídas
 */
notificationRouter.get('/unread-count', authMiddleware, (req, res, next) =>
  notificationController.unreadCount(req, res, next)
);

/**
 * @openapi
 * /v1/notifications/stream:
 *   get:
 *     tags: [Notifications]
 *     summary: Stream (SSE) de notificaciones en tiempo real
 *     description: >
 *       El token JWT se pasa como query param (?token=...) ya que
 *       EventSource del navegador no admite headers personalizados.
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Stream text/event-stream de notificaciones nuevas
 */
notificationRouter.get('/stream', sseAuthMiddleware, (req, res, next) =>
  notificationController.stream(req, res, next)
);

/**
 * @openapi
 * /v1/notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Marcar todas las notificaciones como leídas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notificaciones marcadas como leídas
 */
notificationRouter.patch('/read-all', authMiddleware, (req, res, next) =>
  notificationController.markAllAsRead(req, res, next)
);

/**
 * @openapi
 * /v1/notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Marcar una notificación como leída
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Notificación marcada como leída
 */
notificationRouter.patch('/:id/read', authMiddleware, (req, res, next) =>
  notificationController.markAsRead(req, res, next)
);

export default notificationRouter;
