import express from 'express';
import integrationController from '../controllers/integration.controller.js';
import externalAuthMiddleware from '../middlewares/externalAuth.middleware.js';
import { medicalRecordUpload } from '../../infrastructure/storage/multer.storage.js';

const integrationRouter = express.Router();

integrationRouter.post(
  '/historial',
  externalAuthMiddleware,
  medicalRecordUpload.single('file'),
  (req, res, next) =>
    integrationController.uploadMedicalRecord(req, res, next)
);

export default integrationRouter;