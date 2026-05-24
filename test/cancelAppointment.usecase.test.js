import { jest } from '@jest/globals';


const SCHEDULED_APPT = {
  id:        'appt-uuid-1',
  doctorId:  'doc-uuid-1',
  patientId: 'pat-uuid-1',
  date:      new Date('2099-12-15'),
  startTime: '09:00',
  endTime:   '09:30',
  status:    'SCHEDULED',
  notes:     null,
  doctor: {
    id:             'doc-uuid-1',
    name:           'Dr. House',
    specialization: 'Diagnóstico',
  },
};

const PATIENT_WITH_EMAIL = {
  id:              'pat-uuid-1',
  name:            'María García',
  document_number: '1234567890',
  email:           'maria@example.com',
  is_active:       true,
};

const PATIENT_WITHOUT_EMAIL = {
  ...PATIENT_WITH_EMAIL,
  email: null,
};

function buildRepos({
  appointment = SCHEDULED_APPT,
  patient = PATIENT_WITH_EMAIL,
  cancelledAppt = null,
} = {}) {
  const cancelResult = cancelledAppt ?? {
    ...SCHEDULED_APPT,
    status:              'CANCELLED',
    cancellationReason:  'Motivo de prueba para cancelar la cita medica',
    cancelledAt:         new Date(),
  };

  return {
    appointmentRepository: {
      findById:         jest.fn().mockResolvedValue(appointment),
      cancelWithReason: jest.fn().mockResolvedValue(cancelResult),
    },
    patientRepository: {
      findById: jest.fn().mockResolvedValue(patient),
    },
    emailService: {
      sendAppointmentCancellationEmail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Suite 1 — Schema de validación
// ════════════════════════════════════════════════════════════════════════════

describe('cancelAppointmentSchema', () => {
  // Import dinámico para aislar el módulo
  let cancelAppointmentSchema;

  beforeAll(async () => {
    // Simulamos el módulo directamente con Zod en el contexto del test
    const { z } = await import('zod');
    cancelAppointmentSchema = z.object({
      reason: z
        .string({ required_error: 'El motivo de cancelación es requerido' })
        .trim()
        .min(10, 'El motivo debe tener al menos 10 caracteres')
        .max(500, 'El motivo no puede superar los 500 caracteres'),
    });
  });

  it('debería aceptar un motivo válido', () => {
    const result = cancelAppointmentSchema.safeParse({
      reason: 'El médico tuvo una emergencia y no puede atender.',
    });
    expect(result.success).toBe(true);
  });

  it('debería rechazar si falta reason', () => {
    const result = cancelAppointmentSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('debería rechazar reason con menos de 10 caracteres', () => {
    const result = cancelAppointmentSchema.safeParse({ reason: 'Corto' });
    expect(result.success).toBe(false);
    const msgs = (result.error.issues ?? []).map((i) => i.message).join(' ');
    expect(msgs).toMatch(/10/);
  });

  it('debería rechazar reason con más de 500 caracteres', () => {
    const result = cancelAppointmentSchema.safeParse({ reason: 'x'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('debería hacer trim al reason', () => {
    const result = cancelAppointmentSchema.safeParse({ reason: '  Motivo con espacios laterales OK  ' });
    expect(result.success).toBe(true);
    expect(result.data.reason).toBe('Motivo con espacios laterales OK');
  });

  it('debería aceptar exactamente 10 caracteres', () => {
    const result = cancelAppointmentSchema.safeParse({ reason: '1234567890' });
    expect(result.success).toBe(true);
  });

  it('debería aceptar exactamente 500 caracteres', () => {
    const result = cancelAppointmentSchema.safeParse({ reason: 'x'.repeat(500) });
    expect(result.success).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Suite 2 — CancelAppointmentUseCase
// ════════════════════════════════════════════════════════════════════════════

describe('CancelAppointmentUseCase', () => {
  let CancelAppointmentUseCase;

  beforeAll(async () => {
    const mod = await import(
      '../src/application/use-cases/appointment/cancelAppointment.usecase.js'
    );
    CancelAppointmentUseCase = mod.default;
  });

  // ── Happy path ─────────────────────────────────────────────────────────

  it('debería cancelar una cita SCHEDULED y retornar los datos de cancelación', async () => {
    const { appointmentRepository, patientRepository, emailService } = buildRepos();
    const useCase = new CancelAppointmentUseCase(appointmentRepository, patientRepository, emailService);

    const result = await useCase.execute({
      appointmentId: 'appt-uuid-1',
      reason:        'El médico tuvo una emergencia hospitalaria urgente.',
      performedBy:   'admin-uuid-1',
    });

    expect(appointmentRepository.cancelWithReason).toHaveBeenCalledWith(
      'appt-uuid-1',
      'El médico tuvo una emergencia hospitalaria urgente.',
      'admin-uuid-1'
    );
    expect(result.status).toBe('CANCELLED');
    expect(result.reason).toBeDefined();
    expect(result.cancelledBy).toBe('admin-uuid-1');
  });

  it('debería poblar context.appointment tras la cancelación', async () => {
    const { appointmentRepository, patientRepository, emailService } = buildRepos();
    const useCase = new CancelAppointmentUseCase(appointmentRepository, patientRepository, emailService);
    const context = {};

    await useCase.execute(
      { appointmentId: 'appt-uuid-1', reason: 'Motivo de prueba para la cita.', performedBy: 'admin-1' },
      context
    );

    expect(context.appointment).toBeDefined();
    expect(context.appointment.status).toBe('CANCELLED');
  });

  it('debería enviar email de notificación al paciente con los datos correctos', async () => {
    const { appointmentRepository, patientRepository, emailService } = buildRepos();
    const useCase = new CancelAppointmentUseCase(appointmentRepository, patientRepository, emailService);

    await useCase.execute({
      appointmentId: 'appt-uuid-1',
      reason:        'El consultorio estará en mantenimiento ese día.',
      performedBy:   'admin-uuid-1',
    });

    expect(emailService.sendAppointmentCancellationEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendAppointmentCancellationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to:          PATIENT_WITH_EMAIL.email,
        patientName: PATIENT_WITH_EMAIL.name,
        reason:      'El consultorio estará en mantenimiento ese día.',
      })
    );
  });

  it('debería omitir el email si el paciente no tiene correo registrado (fallo silencioso)', async () => {
    const { appointmentRepository, patientRepository, emailService } = buildRepos({
      patient: PATIENT_WITHOUT_EMAIL,
    });
    const useCase = new CancelAppointmentUseCase(appointmentRepository, patientRepository, emailService);

    await expect(
      useCase.execute({
        appointmentId: 'appt-uuid-1',
        reason:        'No hay médico disponible para esta fecha.',
        performedBy:   'admin-uuid-1',
      })
    ).resolves.toBeDefined();

    expect(emailService.sendAppointmentCancellationEmail).not.toHaveBeenCalled();
  });

  it('debería continuar aunque el email falle (fallo silencioso)', async () => {
    const { appointmentRepository, patientRepository, emailService } = buildRepos();
    emailService.sendAppointmentCancellationEmail = jest
      .fn()
      .mockRejectedValue(new Error('SMTP connection refused'));

    const useCase = new CancelAppointmentUseCase(appointmentRepository, patientRepository, emailService);

    const result = await useCase.execute({
      appointmentId: 'appt-uuid-1',
      reason:        'Motivo de cancelación por fuerza mayor aquí.',
      performedBy:   'admin-uuid-1',
    });

    // La cancelación debe haberse completado igualmente
    expect(result.status).toBe('CANCELLED');
    expect(appointmentRepository.cancelWithReason).toHaveBeenCalledTimes(1);
  });

  // ── Errores esperados ───────────────────────────────────────────────────

  it('debería lanzar NotFoundError si la cita no existe', async () => {
    const { appointmentRepository, patientRepository, emailService } = buildRepos({
      appointment: null,
    });
    const useCase = new CancelAppointmentUseCase(appointmentRepository, patientRepository, emailService);

    await expect(
      useCase.execute({
        appointmentId: 'appt-no-existe',
        reason:        'Motivo cualquiera de cancelacion.',
        performedBy:   'admin-1',
      })
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'NOT_FOUND' });

    expect(appointmentRepository.cancelWithReason).not.toHaveBeenCalled();
    expect(emailService.sendAppointmentCancellationEmail).not.toHaveBeenCalled();
  });

  it('debería lanzar ValidationError si la cita ya está CANCELLED', async () => {
    const { appointmentRepository, patientRepository, emailService } = buildRepos({
      appointment: { ...SCHEDULED_APPT, status: 'CANCELLED' },
    });
    const useCase = new CancelAppointmentUseCase(appointmentRepository, patientRepository, emailService);

    await expect(
      useCase.execute({
        appointmentId: 'appt-uuid-1',
        reason:        'Motivo de cancelacion duplicada valida.',
        performedBy:   'admin-1',
      })
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'VALIDATION_ERROR' });

    expect(appointmentRepository.cancelWithReason).not.toHaveBeenCalled();
  });

  it('debería lanzar ValidationError si la cita está COMPLETED', async () => {
    const { appointmentRepository, patientRepository, emailService } = buildRepos({
      appointment: { ...SCHEDULED_APPT, status: 'COMPLETED' },
    });
    const useCase = new CancelAppointmentUseCase(appointmentRepository, patientRepository, emailService);

    await expect(
      useCase.execute({
        appointmentId: 'appt-uuid-1',
        reason:        'No se puede cancelar una cita completada.',
        performedBy:   'admin-1',
      })
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'VALIDATION_ERROR' });
  });

  it('debería lanzar ValidationError si la cita está NO_SHOW', async () => {
    const { appointmentRepository, patientRepository, emailService } = buildRepos({
      appointment: { ...SCHEDULED_APPT, status: 'NO_SHOW' },
    });
    const useCase = new CancelAppointmentUseCase(appointmentRepository, patientRepository, emailService);

    await expect(
      useCase.execute({
        appointmentId: 'appt-uuid-1',
        reason:        'No se puede cancelar una cita marcada no show.',
        performedBy:   'admin-1',
      })
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'VALIDATION_ERROR' });
  });

  it('debería lanzar ValidationError si reason está vacío', async () => {
    const { appointmentRepository, patientRepository, emailService } = buildRepos();
    const useCase = new CancelAppointmentUseCase(appointmentRepository, patientRepository, emailService);

    await expect(
      useCase.execute({
        appointmentId: 'appt-uuid-1',
        reason:        '',
        performedBy:   'admin-1',
      })
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'VALIDATION_ERROR' });

    expect(appointmentRepository.cancelWithReason).not.toHaveBeenCalled();
  });

  it('debería lanzar ValidationError si reason tiene menos de 10 caracteres', async () => {
    const { appointmentRepository, patientRepository, emailService } = buildRepos();
    const useCase = new CancelAppointmentUseCase(appointmentRepository, patientRepository, emailService);

    await expect(
      useCase.execute({
        appointmentId: 'appt-uuid-1',
        reason:        'Corto',
        performedBy:   'admin-1',
      })
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'VALIDATION_ERROR' });
  });

  it('debería pasar el performedBy correcto a cancelWithReason', async () => {
    const { appointmentRepository, patientRepository, emailService } = buildRepos();
    const useCase = new CancelAppointmentUseCase(appointmentRepository, patientRepository, emailService);

    await useCase.execute({
      appointmentId: 'appt-uuid-1',
      reason:        'Cancelación por decisión administrativa interna.',
      performedBy:   'admin-uuid-especifico',
    });

    expect(appointmentRepository.cancelWithReason).toHaveBeenCalledWith(
      'appt-uuid-1',
      expect.any(String),
      'admin-uuid-especifico'
    );
  });
});