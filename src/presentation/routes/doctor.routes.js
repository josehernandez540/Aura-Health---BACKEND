
import express from 'express';
import { createDoctorSchema } from '../middlewares/schemas/createDoctor.schema.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { Role } from '../../domain/entities/role.enum.js'
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

export default doctorRouter;