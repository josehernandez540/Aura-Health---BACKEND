import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import historyController from '../controllers/history.controller.js';
import { Role } from '../../domain/entities/role.enum.js';

const historyRouter = express.Router();

historyRouter.get(
  '/:patientId',
  authMiddleware,
  authorizeRoles(Role.DOCTOR, Role.ADMIN),
  (req, res, next) =>
    historyController.findByPatient(req, res, next)
);

export default historyRouter;