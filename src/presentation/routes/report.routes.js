import { Router } from 'express';

import reportController from '../controllers/report.controller.js';

import authMiddleware from '../middlewares/auth.middleware.js';

const reportRouter = Router();

reportRouter.get(
    '/:patientId',
    authMiddleware,
    reportController.generate
);

export default reportRouter;