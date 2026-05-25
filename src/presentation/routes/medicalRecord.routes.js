import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import medicalRecordController from '../controllers/medicalRecord.controller.js';

const medicalRecordRouter = express.Router();

medicalRecordRouter.get(
  '/:id/download',
  authMiddleware,
  (req, res, next) =>
    medicalRecordController.download(req, res, next)
);

export default medicalRecordRouter;