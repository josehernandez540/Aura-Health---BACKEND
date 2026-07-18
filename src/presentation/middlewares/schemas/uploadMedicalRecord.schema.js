import { z } from 'zod';

export const uploadMedicalRecordSchema = z.object({
  patientId: z
    .string({ required_error: 'El paciente es requerido' })
    .uuid('El id del paciente debe ser un UUID válido'),

  documentType: z.enum(['HISTORIA_CLINICA', 'EXAMEN', 'DIAGNOSTICO'], {
    required_error: 'El tipo de documento es requerido',
    invalid_type_error: 'Tipo de documento inválido',
  }),
});
