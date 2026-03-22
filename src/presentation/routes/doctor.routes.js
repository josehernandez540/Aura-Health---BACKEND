import express from 'express';
import { createDoctorSchema } from '../middlewares/schemas/createDoctor.schema.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { Role } from '../../domain/entities/role.enum.js';
import doctorController from '../controllers/doctor.controller.js';
import { validate } from '../middlewares/validate.middleware.js';

const doctorRouter = express.Router();

/**
 * @openapi
 * /v1/doctors:
 *   post:
 *     tags: [Doctors]
 *     summary: Crear médico (solo ADMIN)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, documentNumber, specialization, email]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Dr. Juan Pérez
 *               documentNumber:
 *                 type: string
 *                 example: "1234567890"
 *               specialization:
 *                 type: string
 *                 example: Cardiología
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juan.perez@aura.com
 *               licenseNumber:
 *                 type: string
 *                 example: MED-2024-001
 *               phone:
 *                 type: string
 *                 example: "+57 300 0000000"
 *     responses:
 *       200:
 *         description: Médico creado exitosamente
 *       400:
 *         description: Validación fallida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *       409:
 *         description: Email o documento ya registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
doctorRouter.post(
  '/',
  authorizeRoles(Role.ADMIN),
  validate(createDoctorSchema),
  (req, res, next) => doctorController.create(req, res, next)
);

/**
 * @openapi
 * /v1/doctors/{id}/status:
 *   patch:
 *     tags: [Doctors]
 *     summary: Cambiar estado de un médico (solo ADMIN)
 *     description: Activa o inactiva un médico. Solo accesible para administradores.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del médico
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
 *                 enum: [ACTIVE, INACTIVE]
 *                 example: INACTIVE
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 *       400:
 *         description: Estado inválido (no es ACTIVE ni INACTIVE)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *       404:
 *         description: Médico no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
doctorRouter.patch(
  '/:id/status',
  authorizeRoles(Role.ADMIN),
  (req, res, next) => doctorController.updateStatus(req, res, next)
);

export default doctorRouter;