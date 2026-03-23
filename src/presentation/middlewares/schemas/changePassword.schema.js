import { z } from 'zod';


export const changePasswordSchema = z.object({
    currentPassword: z
        .string({ required_error: 'La contraseña actual es requerida' })
        .min(1, 'La contraseña actual es requerida'),

    newPassword: z
        .string({ required_error: 'La nueva contraseña es requerida' })
        .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
        .max(128, 'La contraseña no puede superar los 128 caracteres')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'La contraseña debe tener al menos una mayúscula, una minúscula y un número'
        ),
});