import { z } from 'zod';

export const medicationSchema = z.object({
  name: z
    .string({ required_error: 'El nombre del medicamento es requerido' })
    .trim()
    .min(1, 'El nombre del medicamento no puede estar vacío')
    .max(200, 'El nombre del medicamento no puede superar los 200 caracteres'),

  dose: z
    .string({ required_error: 'La dosis es requerida' })
    .trim()
    .min(1, 'La dosis no puede estar vacía')
    .max(100, 'La dosis no puede superar los 100 caracteres'),

  frequency: z
    .string()
    .trim()
    .max(100, 'La frecuencia no puede superar los 100 caracteres')
    .optional(),

  duration: z
    .string()
    .trim()
    .max(100, 'La duración no puede superar los 100 caracteres')
    .optional(),

  instructions: z
    .string()
    .trim()
    .max(500, 'Las instrucciones no pueden superar los 500 caracteres')
    .optional(),
});

export const createTreatmentSchema = z.object({
  patientId: z
    .string({ required_error: 'El paciente es requerido' })
    .uuid('El id del paciente debe ser un UUID válido'),

  description: z
    .string({ required_error: 'La descripción del tratamiento es requerida' })
    .trim()
    .min(5, 'La descripción debe tener al menos 5 caracteres')
    .max(1000, 'La descripción no puede superar los 1000 caracteres'),

  medications: z
    .array(medicationSchema, { required_error: 'Los medicamentos son requeridos' })
    .min(1, 'Debe incluir al menos un medicamento')
    .max(20, 'No se pueden registrar más de 20 medicamentos por tratamiento'),
    
  requiresApproval: z.boolean().optional().default(false),
});