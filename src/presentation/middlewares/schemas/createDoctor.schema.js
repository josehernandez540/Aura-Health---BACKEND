import { z } from 'zod';

export const createDoctorSchema = z.object({
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
        .regex(/^[A-Za-z0-9-]+$/, 'El número de identificación solo puede contener letras, números y guiones'),
    specialization: z
        .string({ required_error: 'La especialidad es requerida' })
        .trim()
        .min(2, 'La especialidad debe tener al menos 2 caracteres')
        .max(100, 'La especialidad no puede superar los 100 caracteres'),
    email: z
        .string({ required_error: 'El correo es requerido' })
        .trim()
        .email('El correo electrónico no es válido')
        .max(255, 'El correo no puede superar los 255 caracteres'),
    licenseNumber: z
        .string()
        .trim()
        .max(50, 'El número de licencia no puede superar los 50 caracteres')
        .optional(),
    phone: z
        .string()
        .trim()
        .max(20, 'El teléfono no puede superar los 20 caracteres')
        .optional(),
});