import express from 'express';
import authController from '../controllers/auth.controller.js';
import profileController from '../controllers/profile.controller.js';
import authMiddleware from "../middlewares/auth.middleware.js";
import { validate } from '../middlewares/validate.middleware.js';
import { changePasswordSchema } from '../middlewares/schemas/changePassword.schema.js';
import { updateMyProfileSchema } from '../middlewares/schemas/updateMyProfile.schema.js';

const authRouter = express.Router();

/**
 * @openapi
 * /v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@aura.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login exitoso — retorna JWT
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
authRouter.post('/login', authController.login);

/**
 * @openapi
 * /v1/auth/change-password:
 *   patch:
 *     tags: [Auth]
 *     summary: Cambiar contraseña (especialmente contraseñas temporales)
 *     description: >
 *       Permite cambiar la contraseña del usuario autenticado.
 *       Obligatorio cuando mustChangePassword = true en el JWT.
 *
 *       **Flujo para médicos con contraseña temporal:**
 *       1. El médico hace login → recibe `mustChangePassword: true`
 *       2. El frontend redirige a la pantalla de cambio de contraseña
 *       3. El médico llama a este endpoint con su token actual
 *       4. Se devuelve un nuevo token con `mustChangePassword: false`
 *       5. El frontend guarda el nuevo token y da acceso al sistema
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Contraseña actual (o temporal asignada por el sistema)
 *                 example: "Aura1234!"
 *               newPassword:
 *                 type: string
 *                 description: >
 *                   Nueva contraseña. Debe tener mínimo 8 caracteres,
 *                   al menos una mayúscula, una minúscula y un número.
 *                 example: "MiNuevaClave99"
 *     responses:
 *       200:
 *         description: Contraseña cambiada — devuelve nuevo token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: Nuevo JWT con mustChangePassword = false
 *                     message: { type: string }
 *       400:
 *         description: Validación fallida (contraseña muy corta, sin mayúscula, etc.)
 *       401:
 *         description: No autenticado o contraseña actual incorrecta
 */
authRouter.patch(
  '/change-password',
  authMiddleware,
  validate(changePasswordSchema),
  (req, res, next) => authController.changePassword(req, res, next)
);

/**
 * @openapi
 * /v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Obtener el perfil del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario (nombre, correo, rol y datos de médico si aplica)
 *   put:
 *     tags: [Auth]
 *     summary: Actualizar el perfil propio (nombre y/o correo)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       409:
 *         description: El correo ya está en uso por otra cuenta
 */
authRouter.get(
  '/me',
  authMiddleware,
  (req, res, next) => profileController.getMe(req, res, next)
);

authRouter.put(
  '/me',
  authMiddleware,
  validate(updateMyProfileSchema),
  (req, res, next) => profileController.updateMe(req, res, next)
);

export default authRouter;