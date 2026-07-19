import { z } from 'zod';

export const updateMyProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(150, 'El nombre no puede superar los 150 caracteres')
    .optional(),

  email: z
    .string()
    .trim()
    .email('El correo no es válido')
    .max(150, 'El correo no puede superar los 150 caracteres')
    .optional(),

}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'Debes proporcionar al menos un campo para actualizar' }
);
