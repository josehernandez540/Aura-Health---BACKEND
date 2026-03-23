import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createAppointmentSchema = z
  .object({
    doctorId: z
      .string({ required_error: 'El médico es requerido' })
      .uuid('El id del médico debe ser un UUID válido'),

    patientId: z
      .string({ required_error: 'El paciente es requerido' })
      .uuid('El id del paciente debe ser un UUID válido'),

    date: z
      .string({ required_error: 'La fecha es requerida' })
      .refine((v) => !isNaN(Date.parse(v)), 'La fecha no es válida (use YYYY-MM-DD)')
      .refine((v) => {
        const d = new Date(v);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d >= today;
      }, 'No se pueden programar citas en fechas pasadas'),

    startTime: z
      .string({ required_error: 'La hora de inicio es requerida' })
      .regex(timeRegex, 'La hora de inicio debe tener formato HH:MM (24 h)'),

    endTime: z
      .string({ required_error: 'La hora de fin es requerida' })
      .regex(timeRegex, 'La hora de fin debe tener formato HH:MM (24 h)'),

    notes: z
      .string()
      .max(500, 'Las notas no pueden superar los 500 caracteres')
      .optional(),
  })
  .refine(
    ({ startTime, endTime }) => startTime < endTime,
    {
      message: 'La hora de fin debe ser posterior a la hora de inicio',
      path: ['endTime'],
    }
  );