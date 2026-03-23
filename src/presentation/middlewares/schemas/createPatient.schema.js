import { z } from 'zod';

export const createPatientSchema = z.object({
    name: z
        .string({ required_error: 'El nombre es requerido' })
        .trim()
        .min(2, 'El nombre debe tener al menos 2 caracteres')
        .max(150, 'El nombre no puede superar los 150 caracteres'),

    documentNumber: z
        .string({ required_error: 'El número de identificación es requerido' })
        .trim()
        .min(5, 'El número de identificación debe tener al menos 5 caracteres')
        .max(20, 'El número de identificación no puede superar los 20 caracteres')
        .regex(
            /^[A-Za-z0-9-]+$/,
            'El número de identificación solo puede contener letras, números y guiones'
        ),

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
});

