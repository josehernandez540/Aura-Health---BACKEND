import { z } from 'zod';

export const noShowAppointmentSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(500, 'El motivo no puede superar los 500 caracteres')
    .optional(),
});