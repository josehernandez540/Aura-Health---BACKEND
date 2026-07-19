import { Router } from "express";
import authRoute from "./auth.routes.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import adminRoute from "./admin.routes.js";
import doctorRoute from './doctor.routes.js';
import patientRoute from './patient.routes.js';
import appointmentRoute from "./appointment.routes.js";
import auditRoute from "./audit.routes.js";
import integrationRouter from './integration.routes.js';
import medicalRecordRouter from './medicalRecord.routes.js';
import historyRouter from './history.routes.js';
import treatmentRoute from "./treatment.routes.js";
import reminderRouter from './reminder.routes.js';
import reportRoutes from './report.routes.js';
import notificationRouter from './notification.routes.js';
import analyticsRoutes from './analytics.routes.js';
import dashboardRoutes from './dashboard.routes.js';

const router = Router();

router.get("/v1/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
router.use("/v1/auth", authRoute);
router.get("/v1/protected", authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Acceso permitido",
    user: req.user,
  });
});
router.use("/v1/admin", authMiddleware, adminRoute);
router.use('/v1/doctors', authMiddleware, doctorRoute);
router.use('/v1/patients', authMiddleware, patientRoute);
router.use('/v1/appointments', authMiddleware, appointmentRoute);
router.use('/v1/audit', authMiddleware, auditRoute);
router.use('/v1/medical-records', medicalRecordRouter);
router.use('/v1/integracion', integrationRouter);
router.use('/v1/historial', authMiddleware, historyRouter);
router.use('/v1/treatments', authMiddleware, treatmentRoute);
router.use('/v1/reminders', reminderRouter);
router.use('/v1/reportes', authMiddleware, reportRoutes);
router.use('/v1/notifications', notificationRouter);
router.use('/v1/analytics', authMiddleware, analyticsRoutes);
router.use('/v1/dashboard', authMiddleware, dashboardRoutes);

export default router;