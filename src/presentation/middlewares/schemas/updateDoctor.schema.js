import { z } from 'zod';

export const updateDoctorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(150, 'El nombre no puede superar los 150 caracteres')
    .optional(),

  specialization: z
    .string()
    .trim()
    .min(2, 'La especialidad debe tener al menos 2 caracteres')
    .max(100, 'La especialidad no puede superar los 100 caracteres')
    .optional(),

  licenseNumber: z
    .string()
    .trim()
    .max(50, 'El número de licencia no puede superar los 50 caracteres')
    .optional(),

}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'Debes proporcionar al menos un campo para actualizar' }
);