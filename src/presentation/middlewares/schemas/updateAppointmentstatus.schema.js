import { z } from 'zod';
 
export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['CANCELLED', 'COMPLETED', 'NO_SHOW'], {
    required_error: 'El estado es requerido',
    invalid_type_error: 'Estado inválido. Use: CANCELLED, COMPLETED o NO_SHOW',
  }),
  notes: z
    .string()
    .max(500, 'Las notas no pueden superar los 500 caracteres')
    .optional(),
});
