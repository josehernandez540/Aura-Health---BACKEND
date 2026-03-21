import { Router } from "express";
import authRoute from "./auth.routes.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

router.use("/v1/auth", authRoute);
router.get("/v1/protected", authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Acceso permitido",
    user: req.user,
  });
});

export default router;