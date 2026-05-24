import { z } from 'zod';

export const cancelAppointmentSchema = z.object({
  reason: z
    .string({ required_error: 'El motivo de cancelación es requerido' })
    .trim()
    .min(10, 'El motivo debe tener al menos 10 caracteres')
    .max(500, 'El motivo no puede superar los 500 caracteres'),
});