import { Router } from "express";
import authRoute from "./auth.routes.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import adminRoute from "./admin.routes.js";
import doctorRoute from './doctor.routes.js';
import patientRoute from './patient.routes.js';
import appointmentRoute from "./appointment.routes.js";
import auditRoute from "./audit.routes.js";

const router = Router();

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

export default router;