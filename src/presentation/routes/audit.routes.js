import express from 'express';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import auditController from '../controllers/audit.controller.js';
import { Role } from '../../domain/entities/role.enum.js';

const auditRouter = express.Router();

/**
 * @openapi
 * /v1/audit:
 *   get:
 *     tags: [Audit]
 *     summary: Listar logs de auditoría (solo ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Página actual
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *         description: Registros por página (máx. 100)
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *         description: Filtrar por ID de usuario
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *         description: >
 *           Filtrar por acción (búsqueda parcial, insensible a mayúsculas).
 *           Valores disponibles: USER_LOGIN, USER_CREATED, USER_PASSWORD_CHANGED,
 *           APPOINTMENT_CREATED, APPOINTMENT_CANCELLED, TREATMENT_APPROVED,
 *           DOCTOR_STATUS_CHANGED, PATIENT_CREATED, PATIENT_UPDATED, PATIENT_STATUS_CHANGED
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [USER, DOCTOR, PATIENT, APPOINTMENT]
 *         description: Filtrar por tipo de entidad
 *       - in: query
 *         name: entityId
 *         schema: { type: string, format: uuid }
 *         description: Filtrar por ID de la entidad afectada
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [INFO, WARNING, ERROR]
 *         description: Filtrar por severidad del log
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *         description: Fecha de inicio del rango (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *         description: Fecha de fin del rango (ISO 8601)
 *     responses:
 *       200:
 *         description: Lista paginada de logs de auditoría
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string, format: uuid }
 *                           action: { type: string }
 *                           entityType: { type: string }
 *                           entityId: { type: string, format: uuid }
 *                           metadata: { type: object }
 *                           severity: { type: string }
 *                           createdAt: { type: string, format: date-time }
 *                           user:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id: { type: string, format: uuid }
 *                               email: { type: string }
 *                               role: { type: string }
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     totalPages: { type: integer }
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Rol insuficiente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
auditRouter.get('/', authorizeRoles(Role.ADMIN), (req, res, next) =>
  auditController.findAll(req, res, next)
);

export default auditRouter;