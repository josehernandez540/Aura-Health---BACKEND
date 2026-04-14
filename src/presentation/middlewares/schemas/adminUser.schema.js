import { z } from 'zod';

export const createAdminUserSchema = z.object({
    email: z
        .string({ required_error: 'El correo es requerido' })
        .trim()
        .email('El correo electrónico no es válido')
        .max(255, 'El correo no puede superar los 255 caracteres'),

    name: z
        .string({ required_error: 'El nombre es requerido' })
        .trim()
        .min(2, 'El nombre debe tener al menos 2 caracteres')
        .max(150, 'El nombre no puede superar los 150 caracteres'),
});

export const updateAdminUserSchema = z.object({
    email: z
        .string()
        .trim()
        .email('El correo electrónico no es válido')
        .max(255, 'El correo no puede superar los 255 caracteres')
        .optional(),

    name: z
        .string()
        .trim()
        .min(2, 'El nombre debe tener al menos 2 caracteres')
        .max(150, 'El nombre no puede superar los 150 caracteres')
        .optional(),
}).refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: 'Debes proporcionar al menos un campo para actualizar' }
);

export const toggleAdminStatusSchema = z.object({
    status: z.enum(['ACTIVE', 'INACTIVE'], {
        required_error: 'El estado es requerido',
        invalid_type_error: 'Estado inválido. Use: ACTIVE o INACTIVE',
    }),
});