import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const rescheduleAppointmentSchema = z.object({
    newDate: z
        .string({ required_error: 'La nueva fecha es requerida' })
        .refine((v) => !isNaN(Date.parse(v)), 'La fecha no es válida (use YYYY-MM-DD)')
        .refine((v) => {
            const d = new Date(`${v}T00:00:00`);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return d >= today;
        }, 'No se pueden programar citas en fechas pasadas'),
    newStartTime: z
        .string({ required_error: 'La nueva hora de inicio es requerida' })
        .regex(timeRegex, 'La hora de inicio debe tener formato HH:MM (24 h)'),
    newEndTime: z
        .string({ required_error: 'La nueva hora de fin es requerida' })
        .regex(timeRegex, 'La hora de fin debe tener formato HH:MM (24 h)'),
    reason: z
        .string()
        .max(500, 'El motivo no puede superar los 500 caracteres')
        .optional(),
})
.refine(
    ({ newStartTime, newEndTime }) => newStartTime < newEndTime,
    {
        message: 'La hora de fin debe ser posterior a la hora de inicio',
        path: ['newEndTime'],
    }
);