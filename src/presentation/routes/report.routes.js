import { Router } from 'express';

import reportController from '../controllers/report.controller.js';

import authMiddleware from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { Role } from '../../domain/entities/role.enum.js';

const reportRouter = Router();

/**
 * @openapi
 * /v1/reportes/consolidado/resumen:
 *   get:
 *     tags: [Reports]
 *     summary: Vista previa (JSON, sin generar PDF) del reporte consolidado (ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: doctorId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: patientId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Resumen con métricas consolidadas
 */
reportRouter.get(
    '/consolidado/resumen',
    authMiddleware,
    authorizeRoles(Role.ADMIN),
    reportController.previewConsolidated
);

/**
 * @openapi
 * /v1/reportes/consolidado:
 *   get:
 *     tags: [Reports]
 *     summary: Generar reporte consolidado en PDF, con filtros opcionales (ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: doctorId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: patientId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: PDF del reporte consolidado
 */
reportRouter.get(
    '/consolidado',
    authMiddleware,
    authorizeRoles(Role.ADMIN),
    reportController.generateConsolidated
);

/**
 * @openapi
 * /v1/reportes/historial:
 *   get:
 *     tags: [Reports]
 *     summary: Historial de reportes generados + estadísticas (ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de reportes recientes + conteos (total, este mes, hoy)
 */
reportRouter.get(
    '/historial',
    authMiddleware,
    authorizeRoles(Role.ADMIN),
    reportController.history
);

/**
 * @openapi
 * /v1/reportes/historial/{id}/pdf:
 *   get:
 *     tags: [Reports]
 *     summary: Descargar un reporte previamente generado (ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: PDF del reporte almacenado
 *       404:
 *         description: Reporte no encontrado
 */
reportRouter.get(
    '/historial/:id/pdf',
    authMiddleware,
    authorizeRoles(Role.ADMIN),
    reportController.downloadHistorical
);

/**
 * @openapi
 * /v1/reportes/{patientId}:
 *   get:
 *     tags: [Reports]
 *     summary: Generar reporte clínico individual en PDF (ADMIN o DOCTOR)
 *     description: >
 *       Un DOCTOR solo puede generar el reporte de un paciente asignado a él.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: PDF del reporte clínico
 *       404:
 *         description: Paciente no encontrado
 */
reportRouter.get(
    '/:patientId',
    authMiddleware,
    authorizeRoles(Role.ADMIN, Role.DOCTOR),
    reportController.generate
);

export default reportRouter;
