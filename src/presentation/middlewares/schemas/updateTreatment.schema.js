import { z } from 'zod';
import { medicationSchema } from './createTreatment.schema.js';

export const updateTreatmentSchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(5, 'La descripción debe tener al menos 5 caracteres')
      .max(1000, 'La descripción no puede superar los 1000 caracteres')
      .optional(),

    medications: z
      .array(medicationSchema)
      .min(1, 'Debe incluir al menos un medicamento')
      .max(20, 'No se pueden registrar más de 20 medicamentos por tratamiento')
      .optional(),

    reason: z
      .string({ required_error: 'El motivo del cambio es requerido para mantener trazabilidad clínica' })
      .trim()
      .min(10, 'El motivo debe tener al menos 10 caracteres')
      .max(500, 'El motivo no puede superar los 500 caracteres'),
  })
  .refine((data) => data.description !== undefined || data.medications !== undefined, {
    message: 'Debe modificar la descripción o los medicamentos',
    path: ['description'],
  });
