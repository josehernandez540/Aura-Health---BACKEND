import express from 'express';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { Role } from '../../domain/entities/role.enum.js';
import treatmentController from '../controllers/treatment.controller.js';
import { createTreatmentSchema } from '../middlewares/schemas/createTreatment.schema.js';
import { updateTreatmentStatusSchema } from '../middlewares/schemas/updateTreatmentStatus.schema.js';

const treatmentRouter = express.Router();

/**
 * @openapi
 * /v1/treatments:
 *   get:
 *     tags: [Treatments]
 *     summary: Listar tratamientos (ADMIN o DOCTOR)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: patientId
 *         schema: { type: string, format: uuid }
 *         description: Filtrar por paciente
 *       - in: query
 *         name: doctorId
 *         schema: { type: string, format: uuid }
 *         description: Filtrar por médico
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, COMPLETED, PENDING_APPROVAL]
 *     responses:
 *       200:
 *         description: Lista paginada de tratamientos
 *       401:
 *         description: No autenticado
 */
treatmentRouter.get(
  '/',
  authorizeRoles(Role.ADMIN, Role.DOCTOR),
  (req, res, next) => treatmentController.findAll(req, res, next)
);

/**
 * @openapi
 * /v1/treatments/{id}:
 *   get:
 *     tags: [Treatments]
 *     summary: Obtener tratamiento por ID (ADMIN o DOCTOR)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Datos del tratamiento con medicamentos e historial
 *       404:
 *         description: Tratamiento no encontrado
 */
treatmentRouter.get(
  '/:id',
  authorizeRoles(Role.ADMIN, Role.DOCTOR),
  (req, res, next) => treatmentController.findById(req, res, next)
);

/**
 * @openapi
 * /v1/treatments/patient/{patientId}:
 *   get:
 *     tags: [Treatments]
 *     summary: Listar tratamientos por paciente (ADMIN o DOCTOR)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, COMPLETED, PENDING_APPROVAL]
 *     responses:
 *       200:
 *         description: Tratamientos del paciente
 */
treatmentRouter.get(
  '/patient/:patientId',
  authorizeRoles(Role.ADMIN, Role.DOCTOR),
  (req, res, next) => treatmentController.findByPatient(req, res, next)
);

/**
 * @openapi
 * /v1/treatments:
 *   post:
 *     tags: [Treatments]
 *     summary: Crear tratamiento (solo DOCTOR)
 *     description: >
 *       El médico autenticado genera un tratamiento con medicamentos y dosis para un paciente.
 *       El médico responsable se toma automáticamente del JWT del usuario autenticado.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patientId, description, medications]
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *                 example: "4fa85f64-5717-4562-b3fc-2c963f66afb7"
 *               description:
 *                 type: string
 *                 example: "Tratamiento para infección respiratoria leve"
 *               medications:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [name, dose]
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Amoxicilina"
 *                     dose:
 *                       type: string
 *                       example: "500mg"
 *                     frequency:
 *                       type: string
 *                       example: "Cada 8 horas"
 *                     duration:
 *                       type: string
 *                       example: "7 días"
 *                     instructions:
 *                       type: string
 *                       example: "Tomar con alimentos"
 *     responses:
 *       200:
 *         description: Tratamiento creado exitosamente
 *       400:
 *         description: Validación fallida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Paciente o médico no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
treatmentRouter.post(
  '/',
  authorizeRoles(Role.DOCTOR),
  validate(createTreatmentSchema),
  (req, res, next) => treatmentController.create(req, res, next)
);

/**
 * @openapi
 * /v1/treatments/{id}/status:
 *   patch:
 *     tags: [Treatments]
 *     summary: Actualizar estado de un tratamiento (ADMIN o DOCTOR)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, COMPLETED, PENDING_APPROVAL]
 *                 example: COMPLETED
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       400:
 *         description: Estado inválido
 *       404:
 *         description: Tratamiento no encontrado
 */
treatmentRouter.patch(
  '/:id/status',
  authorizeRoles(Role.ADMIN, Role.DOCTOR),
  validate(updateTreatmentStatusSchema),
  (req, res, next) => treatmentController.updateStatus(req, res, next)
);

treatmentRouter.patch(
  '/:id/approve',
  authorizeRoles(Role.ADMIN),
  (req, res, next) => treatmentController.approve(req, res, next)
);

treatmentRouter.patch(
  '/:id',
  authorizeRoles(Role.ADMIN, Role.DOCTOR),
  (req, res, next) =>
    treatmentController.update(req, res, next)
);

treatmentRouter.get(
  '/:id/history',
  (req, res, next) =>
    treatmentController.history(req, res, next)
);
export default treatmentRouter;