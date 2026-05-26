import { z } from 'zod';

export const updateTreatmentStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'PENDING_APPROVAL'], {
    required_error: 'El estado es requerido',
    invalid_type_error: 'Estado inválido. Use: ACTIVE, COMPLETED o PENDING_APPROVAL',
  }),
});