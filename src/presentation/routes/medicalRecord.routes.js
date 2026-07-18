import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { Role } from '../../domain/entities/role.enum.js';
import medicalRecordController from '../controllers/medicalRecord.controller.js';
import { medicalRecordUpload } from '../../infrastructure/storage/multer.storage.js';
import { uploadMedicalRecordSchema } from '../middlewares/schemas/uploadMedicalRecord.schema.js';

const medicalRecordRouter = express.Router();

medicalRecordRouter.get(
  '/',
  authMiddleware,
  authorizeRoles(Role.ADMIN, Role.DOCTOR),
  (req, res, next) => medicalRecordController.findAll(req, res, next)
);

medicalRecordRouter.post(
  '/',
  authMiddleware,
  authorizeRoles(Role.ADMIN, Role.DOCTOR),
  medicalRecordUpload.single('file'),
  validate(uploadMedicalRecordSchema),
  (req, res, next) => medicalRecordController.upload(req, res, next)
);

medicalRecordRouter.patch(
  '/:id/validate',
  authMiddleware,
  authorizeRoles(Role.ADMIN),
  (req, res, next) => medicalRecordController.validate(req, res, next)
);

medicalRecordRouter.get(
  '/:id/download',
  authMiddleware,
  authorizeRoles(Role.ADMIN, Role.DOCTOR),
  (req, res, next) =>
    medicalRecordController.download(req, res, next)
);

export default medicalRecordRouter;
