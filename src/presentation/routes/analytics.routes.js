import { Router } from 'express';

import analyticsController from '../controllers/analytics.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { Role } from '../../domain/entities/role.enum.js';

const analyticsRouter = Router();

/**
 * @openapi
 * /v1/analytics/overview:
 *   get:
 *     tags: [Analytics]
 *     summary: Estadísticas y series agregadas para el dashboard de analíticas (ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, enum: [7, 30, 90] }
 *     responses:
 *       200:
 *         description: Stats, series por día, distribución por estado, por especialidad, mapa de calor y rendimiento por médico
 */
analyticsRouter.get(
    '/overview',
    authMiddleware,
    authorizeRoles(Role.ADMIN),
    analyticsController.overview
);

export default analyticsRouter;
