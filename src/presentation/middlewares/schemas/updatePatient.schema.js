import { z } from 'zod';

export const updatePatientSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'El nombre debe tener al menos 2 caracteres')
        .max(150, 'El nombre no puede superar los 150 caracteres')
        .optional(),

    birthDate: z
        .string()
        .refine((v) => !v || !isNaN(Date.parse(v)), 'La fecha de nacimiento no es válida')
        .optional(),

    phone: z
        .string()
        .trim()
        .max(20, 'El teléfono no puede superar los 20 caracteres')
        .optional(),

    email: z
        .string()
        .trim()
        .email('El correo electrónico no es válido')
        .max(255, 'El correo no puede superar los 255 caracteres')
        .optional(),
}).refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: 'Debes proporcionar al menos un campo para actualizar' }
);