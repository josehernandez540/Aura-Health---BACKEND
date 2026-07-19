import { Router } from 'express';

import dashboardController from '../controllers/dashboard.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { Role } from '../../domain/entities/role.enum.js';

const dashboardRouter = Router();

/**
 * @openapi
 * /v1/dashboard/overview:
 *   get:
 *     tags: [Dashboard]
 *     summary: Resumen del panel principal, adaptado al rol del usuario autenticado
 *     description: >
 *       ADMIN recibe estadísticas del sistema (pacientes, médicos, citas del mes) y
 *       actividad reciente de auditoría. DOCTOR recibe sus propias citas de hoy,
 *       estadísticas personales del mes y sus notificaciones recientes.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumen del dashboard
 */
dashboardRouter.get(
    '/overview',
    authMiddleware,
    authorizeRoles(Role.ADMIN, Role.DOCTOR),
    dashboardController.overview
);

export default dashboardRouter;
