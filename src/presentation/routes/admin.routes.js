import express from 'express';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import adminController from '../controllers/admin.controller.js';
import { Role } from '../../domain/entities/role.enum.js';

const adminRouter = express.Router();

/**
 * @openapi
 * /v1/admin/info:
 *   get:
 *     tags: [Admin]
 *     summary: Info de administrador (solo ADMIN)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Acceso concedido
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
adminRouter.get( "/info", authorizeRoles(Role.ADMIN), adminController.getInfo);

export default adminRouter;

