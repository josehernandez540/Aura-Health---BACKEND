import express from 'express';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import adminController from '../controllers/admin.controller.js';
import { Role } from '../../domain/entities/role.enum.js';

const adminRouter = express.Router();

adminRouter.get( "/info", authorizeRoles(Role.ADMIN), adminController.getInfo);

export default adminRouter;

