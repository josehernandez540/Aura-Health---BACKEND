import express from 'express';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { Role } from '../../domain/entities/role.enum.js';
import adminUserController from '../controllers/admin.controller.js';
import {
  createAdminUserSchema,
  updateAdminUserSchema,
  toggleAdminStatusSchema,
} from '../middlewares/schemas/adminUser.schema.js';

const adminUserRouter = express.Router();

/**
 * @openapi
 * /v1/admin-users:
 *   get:
 *     tags: [AdminUsers]
 *     summary: Listar administradores (solo ADMIN)
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
 *         description: Buscar por email
 *     responses:
 *       200:
 *         description: Lista paginada de administradores
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
adminUserRouter.get(
  '/',
  authorizeRoles(Role.ADMIN),
  (req, res, next) => adminUserController.findAll(req, res, next)
);

/**
 * @openapi
 * /v1/admin-users/{id}:
 *   get:
 *     tags: [AdminUsers]
 *     summary: Obtener administrador por ID (solo ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Datos del administrador
 *       404:
 *         description: Administrador no encontrado
 */
adminUserRouter.get(
  '/:id',
  authorizeRoles(Role.ADMIN),
  (req, res, next) => adminUserController.findById(req, res, next)
);

/**
 * @openapi
 * /v1/admin-users:
 *   post:
 *     tags: [AdminUsers]
 *     summary: Crear administrador (solo ADMIN)
 *     description: >
 *       Crea un nuevo usuario con rol ADMIN.
 *       Se asigna contraseña temporal y se envía por correo.
 *       El usuario deberá cambiarla en el primer inicio de sesión.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, name]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: nuevo.admin@aura.com
 *               name:
 *                 type: string
 *                 example: Carlos Administrador
 *     responses:
 *       200:
 *         description: Administrador creado exitosamente
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
 *       409:
 *         description: Email ya registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
adminUserRouter.post(
  '/',
  authorizeRoles(Role.ADMIN),
  validate(createAdminUserSchema),
  (req, res, next) => adminUserController.create(req, res, next)
);

/**
 * @openapi
 * /v1/admin-users/{id}:
 *   put:
 *     tags: [AdminUsers]
 *     summary: Editar administrador (solo ADMIN)
 *     description: >
 *       Actualiza el email de un administrador. No se permite cambiar el rol.
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
 *               email:
 *                 type: string
 *                 format: email
 *                 example: nuevo.email@aura.com
 *               name:
 *                 type: string
 *                 example: Nuevo Nombre
 *     responses:
 *       200:
 *         description: Administrador actualizado
 *       400:
 *         description: Datos inválidos o sin cambios
 *       404:
 *         description: Administrador no encontrado
 *       409:
 *         description: Email ya en uso
 */
adminUserRouter.put(
  '/:id',
  authorizeRoles(Role.ADMIN),
  validate(updateAdminUserSchema),
  (req, res, next) => adminUserController.update(req, res, next)
);

/**
 * @openapi
 * /v1/admin-users/{id}/status:
 *   patch:
 *     tags: [AdminUsers]
 *     summary: Activar / Inactivar administrador (solo ADMIN)
 *     description: >
 *       Cambia el estado de un administrador.
 *
 *       **Reglas de negocio:**
 *       - Un admin NO puede desactivarse a sí mismo.
 *       - Siempre debe existir al menos 1 admin activo en el sistema.
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
 *         description: Estado actualizado exitosamente
 *       400:
 *         description: Estado inválido o regla de negocio violada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Administrador no encontrado
 */
adminUserRouter.patch(
  '/:id/status',
  authorizeRoles(Role.ADMIN),
  validate(toggleAdminStatusSchema),
  (req, res, next) => adminUserController.updateStatus(req, res, next)
);

export default adminUserRouter;