import { z } from 'zod';

export const completeAppointmentSchema = z.object({
  notes: z
    .string()
    .trim()
    .max(500, 'Las notas no pueden superar los 500 caracteres')
    .optional(),
});
