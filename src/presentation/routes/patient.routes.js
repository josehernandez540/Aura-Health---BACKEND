import express from 'express';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import patientController from '../controllers/patient.controller.js';
import { Role } from '../../domain/entities/role.enum.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updatePatientSchema } from '../middlewares/schemas/updatePatient.schema.js';
import { createPatientSchema } from '../middlewares/schemas/createPatient.schema.js';

const patientRouter = express.Router();

/**
 * @openapi
 * /v1/patients:
 *   get:
 *     tags: [Patients]
 *     summary: Listar pacientes (ADMIN)
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
 *         name: search
 *         schema: { type: string }
 *         description: Buscar por nombre, documento o email
 *       - in: query
 *         name: onlyActive
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: Lista paginada de pacientes
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Rol insuficiente
 */
patientRouter.get('/', authorizeRoles(Role.ADMIN), (req, res, next) =>
  patientController.findAll(req, res, next)
);

/**
 * @openapi
 * /v1/patients/{id}:
 *   get:
 *     tags: [Patients]
 *     summary: Obtener un paciente por ID (ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Datos del paciente
 *       404:
 *         description: Paciente no encontrado
 */
patientRouter.get('/:id', authorizeRoles(Role.ADMIN), (req, res, next) =>
  patientController.findById(req, res, next)
);

/**
 * @openapi
 * /v1/patients:
 *   post:
 *     tags: [Patients]
 *     summary: Crear paciente (ADMIN)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, documentNumber]
 *             properties:
 *               name:
 *                 type: string
 *                 example: María García
 *               documentNumber:
 *                 type: string
 *                 example: "1234567890"
 *               birthDate:
 *                 type: string
 *                 format: date
 *                 example: "1985-06-15"
 *               phone:
 *                 type: string
 *                 example: "+57 300 1234567"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: maria@example.com
 *     responses:
 *       200:
 *         description: Paciente creado exitosamente
 *       400:
 *         description: Validación fallida
 *       409:
 *         description: Número de identificación ya registrado
 */
patientRouter.post(
  '/',
  authorizeRoles(Role.ADMIN),
  validate(createPatientSchema),
  (req, res, next) => patientController.create(req, res, next)
);

/**
 * @openapi
 * /v1/patients/{id}:
 *   put:
 *     tags: [Patients]
 *     summary: Editar datos de un paciente (ADMIN)
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
 *             properties:
 *               name:
 *                 type: string
 *               birthDate:
 *                 type: string
 *                 format: date
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Paciente actualizado
 *       400:
 *         description: Datos inválidos o sin cambios
 *       404:
 *         description: Paciente no encontrado
 */
patientRouter.put(
  '/:id',
  authorizeRoles(Role.ADMIN),
  validate(updatePatientSchema),
  (req, res, next) => patientController.update(req, res, next)
);

/**
 * @openapi
 * /v1/patients/{id}/status:
 *   patch:
 *     tags: [Patients]
 *     summary: Inactivar o activar un paciente (ADMIN)
 *     description: >
 *       Cambia el estado del paciente sin eliminar su historial clínico.
 *       El historial de citas, tratamientos y registros médicos se conserva intacto.
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
 *                 enum: [ACTIVE, INACTIVE]
 *                 example: INACTIVE
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       400:
 *         description: Estado inválido
 *       404:
 *         description: Paciente no encontrado
 */
patientRouter.patch(
  '/:id/status',
  authorizeRoles(Role.ADMIN),
  (req, res, next) => patientController.updateStatus(req, res, next)
);

export default patientRouter;