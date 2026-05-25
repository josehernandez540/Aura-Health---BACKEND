import express from 'express';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { Role } from '../../domain/entities/role.enum.js';
import appointmentController from '../controllers/appointment.controller.js';
import { createAppointmentSchema } from '../middlewares/schemas/createAppointment.schema.js';
import { updateAppointmentStatusSchema } from '../middlewares/schemas/updateAppointmentStatus.schema.js';
import { cancelAppointmentSchema } from '../middlewares/schemas/cancelAppointment.schema.js';
import { rescheduleAppointmentSchema } from '../middlewares/schemas/rescheduleAppointment.schema.js';

const appointmentRouter = express.Router();

/**
 * @openapi
 * /v1/appointments:
 *   get:
 *     tags: [Appointments]
 *     summary: Listar citas (ADMIN o DOCTOR)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: doctorId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: patientId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *         description: "Filtrar por fecha exacta (YYYY-MM-DD)"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SCHEDULED, CANCELLED, COMPLETED, NO_SHOW]
 *     responses:
 *       200:
 *         description: Lista paginada de citas
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
appointmentRouter.get(
  '/',
  authorizeRoles(Role.ADMIN, Role.DOCTOR),
  (req, res, next) => appointmentController.findAll(req, res, next)
);

/**
 * @openapi
 * /v1/appointments/{id}:
 *   get:
 *     tags: [Appointments]
 *     summary: Obtener cita por ID (ADMIN o DOCTOR)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Datos de la cita
 *       404:
 *         description: Cita no encontrada
 */
appointmentRouter.get(
  '/:id',
  authorizeRoles(Role.ADMIN, Role.DOCTOR),
  (req, res, next) => appointmentController.findById(req, res, next)
);

/**
 * @openapi
 * /v1/appointments:
 *   post:
 *     tags: [Appointments]
 *     summary: Programar cita (solo ADMIN)
 *     description: >
 *       Programa una nueva cita validando disponibilidad del médico.
 *       No se permite solapamiento con citas SCHEDULED del mismo médico en la misma fecha.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [doctorId, patientId, date, startTime, endTime]
 *             properties:
 *               doctorId:
 *                 type: string
 *                 format: uuid
 *                 example: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *               patientId:
 *                 type: string
 *                 format: uuid
 *                 example: "4fa85f64-5717-4562-b3fc-2c963f66afb7"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-15"
 *               startTime:
 *                 type: string
 *                 example: "09:00"
 *               endTime:
 *                 type: string
 *                 example: "09:30"
 *               notes:
 *                 type: string
 *                 example: "Revisión anual"
 *     responses:
 *       200:
 *         description: Cita programada exitosamente — devuelve confirmación completa
 *       400:
 *         description: Datos inválidos (fecha pasada, hora incorrecta, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Médico o paciente no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Conflicto de horario — el médico ya tiene una cita en ese slot
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
appointmentRouter.post(
  '/',
  authorizeRoles(Role.ADMIN),
  validate(createAppointmentSchema),
  (req, res, next) => appointmentController.create(req, res, next)
);



/**
 * @openapi
 * /v1/appointments/{id}/cancel:
 *   patch:
 *     tags: [Appointments]
 *     summary: Cancelar cita con motivo — exclusivo ADMIN (REQ-06)
 *     description: >
 *       Permite a un Administrador cancelar una cita en estado SCHEDULED.
 *       El motivo de cancelación es **obligatorio**. Se notifica automáticamente
 *       al paciente por email y se registra la operación en el log de auditoría
 *       con la acción `APPOINTMENT_CANCELLED_BY_ADMIN`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID de la cita a cancelar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 example: "El médico tuvo una emergencia y no podrá atender ese día."
 *     responses:
 *       200:
 *         description: Cita cancelada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:   { type: boolean, example: true }
 *                 message:   { type: string,  example: "Cita cancelada correctamente" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:         { type: string, format: uuid }
 *                     status:     { type: string, example: "CANCELLED" }
 *                     reason:     { type: string }
 *                     cancelledBy: { type: string, format: uuid }
 *                     cancelledAt: { type: string, format: date-time }
 *       400:
 *         description: Motivo faltante / cita no está en estado SCHEDULED
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Rol insuficiente (solo ADMIN)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Cita no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
appointmentRouter.patch(
  '/:id/cancel',
  authorizeRoles(Role.ADMIN),
  validate(cancelAppointmentSchema),
  (req, res, next) => appointmentController.cancel(req, res, next)
);

/**
 * @openapi
 * /v1/appointments/{id}/reschedule:
 *   patch:
 *     tags: [Appointments]
 *     summary: Reprogramar una cita (solo ADMIN)
 *     description: >
 *       Reprograma una cita SCHEDULED a una nueva fecha/hora.
 *       Valida disponibilidad del médico, registra el cambio en appointment_history
 *       y notifica al paciente por email.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID de la cita a reprogramar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newDate, newStartTime, newEndTime]
 *             properties:
 *               newDate:
 *                 type: string
 *                 format: date
 *                 example: "2099-12-20"
 *                 description: Nueva fecha (no puede ser en el pasado)
 *               newStartTime:
 *                 type: string
 *                 example: "10:00"
 *                 description: Nueva hora de inicio (HH:MM 24h)
 *               newEndTime:
 *                 type: string
 *                 example: "10:30"
 *                 description: Nueva hora de fin (HH:MM 24h)
 *               reason:
 *                 type: string
 *                 example: "El médico tiene una emergencia"
 *                 description: Motivo de la reprogramación (opcional, max 500 chars)
 *     responses:
 *       200:
 *         description: Cita reprogramada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     status: { type: string }
 *                     message: { type: string }
 *                     appointment:
 *                       type: object
 *                       properties:
 *                         id: { type: string }
 *                         date: { type: string }
 *                         startTime: { type: string }
 *                         endTime: { type: string }
 *                         status: { type: string }
 *                     previous:
 *                       type: object
 *                       properties:
 *                         date: { type: string }
 *                         startTime: { type: string }
 *                         endTime: { type: string }
 *                     doctor:
 *                       type: object
 *                     patient:
 *                       type: object
 *       400:
 *         description: Datos inválidos o la cita no está en estado SCHEDULED
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Cita no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: El médico ya tiene una cita en el nuevo horario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
appointmentRouter.patch(
  '/:id/reschedule',
  authorizeRoles(Role.ADMIN),
  validate(rescheduleAppointmentSchema),
  (req, res, next) => appointmentController.reschedule(req, res, next)
);

/**
 * @openapi
 * /v1/appointments/{id}/cancel:
 *   patch:
 *     tags: [Appointments]
 *     summary: Cancelar cita con motivo — exclusivo ADMIN (REQ-06)
 *     description: >
 *       Permite a un Administrador cancelar una cita en estado SCHEDULED.
 *       El motivo de cancelación es **obligatorio**. Se notifica automáticamente
 *       al paciente por email y se registra la operación en el log de auditoría
 *       con la acción `APPOINTMENT_CANCELLED_BY_ADMIN`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID de la cita a cancelar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 example: "El médico tuvo una emergencia y no podrá atender ese día."
 *     responses:
 *       200:
 *         description: Cita cancelada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:   { type: boolean, example: true }
 *                 message:   { type: string,  example: "Cita cancelada correctamente" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:         { type: string, format: uuid }
 *                     status:     { type: string, example: "CANCELLED" }
 *                     reason:     { type: string }
 *                     cancelledBy: { type: string, format: uuid }
 *                     cancelledAt: { type: string, format: date-time }
 *       400:
 *         description: Motivo faltante / cita no está en estado SCHEDULED
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Rol insuficiente (solo ADMIN)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Cita no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
appointmentRouter.patch(
  '/:id/cancel',
  authorizeRoles(Role.ADMIN),
  validate(cancelAppointmentSchema),
  (req, res, next) => appointmentController.cancel(req, res, next)
);

/**
 * @openapi
 * /v1/appointments/{id}/status:
 *   patch:
 *     tags: [Appointments]
 *     summary: Actualizar estado de cita (ADMIN)
 *     description: >
 *       Permite cancelar, marcar como completada o como no-show una cita SCHEDULED.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [CANCELLED, COMPLETED, NO_SHOW]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       400:
 *         description: Transición de estado inválida
 *       404:
 *         description: Cita no encontrada
 */
appointmentRouter.patch(
  '/:id/status',
  authorizeRoles(Role.ADMIN),
  validate(updateAppointmentStatusSchema),
  (req, res, next) => appointmentController.updateStatus(req, res, next)
);

export default appointmentRouter;