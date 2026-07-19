import prisma from '../../config/database.js';
import AppointmentRepository from '../../domain/repositories/appointment.repository.js';
import { ConflictError } from '../../shared/errors/errors.js';

class PrismaAppointmentRepository extends AppointmentRepository {

  _toDateTime(dateStr, timeStr) {
    return new Date(`${dateStr}T${timeStr}:00.000Z`);
  }

  _formatTime(dateObj) {
    if (!dateObj) return null;
    const h = String(dateObj.getUTCHours()).padStart(2, '0');
    const m = String(dateObj.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  _mapRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      doctorId: row.doctor_id,
      patientId: row.patient_id,
      date: row.date,
      startTime: this._formatTime(row.start_time),
      endTime: this._formatTime(row.end_time),
      status: row.status,
      notes: row.notes,
      createdBy: row.created_by,
      createdAt: row.created_at,
      doctor: row.doctors
        ? { id: row.doctors.id, name: row.doctors.name, specialization: row.doctors.specialization }
        : undefined,
      patient: row.patients
        ? { id: row.patients.id, name: row.patients.name, documentNumber: row.patients.document_number, email: row.patients.email }
        : undefined,
    };
  }

  async findById(id) {
    const row = await prisma.appointments.findUnique({
      where: { id },
      include: {
        doctors: { select: { id: true, name: true, specialization: true } },
        patients: { select: { id: true, name: true, document_number: true } },
      },
    });
    return this._mapRow(row);
  }

  async findAll({ page = 1, limit = 20, doctorId, patientId, date, dateFrom, dateTo, status } = {}) {
    const skip = (page - 1) * limit;

    const where = {
      ...(doctorId && { doctor_id: doctorId }),
      ...(patientId && { patient_id: patientId }),
      ...(status && { status }),
      ...(date && { date: new Date(date) }),
      ...(!date && (dateFrom || dateTo) && {
        date: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo) }),
        },
      }),
    };

    const [rows, total] = await Promise.all([
      prisma.appointments.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'asc' }, { start_time: 'asc' }],
        include: {
          doctors: { select: { id: true, name: true, specialization: true } },
          patients: { select: { id: true, name: true, document_number: true, email: true } },
        },
      }),
      prisma.appointments.count({ where }),
    ]);

    return {
      items: rows.map((r) => this._mapRow(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async countDistinctPatients({ doctorId, patientId, dateFrom, dateTo } = {}) {
    const where = {
      ...(doctorId && { doctor_id: doctorId }),
      ...(patientId && { patient_id: patientId }),
      ...((dateFrom || dateTo) && {
        date: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo) }),
        },
      }),
    };

    const rows = await prisma.appointments.findMany({
      where,
      distinct: ['patient_id'],
      select: { patient_id: true },
    });

    return rows.length;
  }

  async findConflict({ doctorId, date, startTime, endTime, excludeId = null }) {
    const dateObj = new Date(date);
    const startDT = this._toDateTime(date, startTime);
    const endDT = this._toDateTime(date, endTime);

    const conflict = await prisma.appointments.findFirst({
      where: {
        doctor_id: doctorId,
        date: dateObj,
        status: 'SCHEDULED',
        start_time: { lt: endDT },
        end_time: { gt: startDT },
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    return conflict ? this._mapRow(conflict) : null;
  }

  async create({ doctorId, patientId, date, startTime, endTime, notes, createdBy }) {
    const dateObj = new Date(date);
    const startDT = this._toDateTime(date, startTime);
    const endDT = this._toDateTime(date, endTime);

    try {
      const row = await prisma.appointments.create({
        data: {
          doctor_id: doctorId,
          patient_id: patientId,
          date: dateObj,
          start_time: startDT,
          end_time: endDT,
          status: 'SCHEDULED',
          notes: notes ?? null,
          created_by: createdBy ?? null,
        },
        include: {
          doctors: { select: { id: true, name: true, specialization: true } },
          patients: { select: { id: true, name: true, document_number: true, email: true } },
        },
      });

      return this._mapRow(row);
    } catch (err) {
      if (err?.code === 'P2002') {
        throw new ConflictError(
          'El médico ya tiene una cita programada en ese horario. Por favor elija otro horario.'
        );
      }
      throw err;
    }
  }

  async reschedule({
    appointmentId,
    newDate,
    newStartTime,
    newEndTime,
    reason,
    performedBy,
    previousDate,
    previousStartTime,
    previousEndTime,
  }) {
    const newDateObj = new Date(newDate);
    const newStartDT = this._toDateTime(newDate, newStartTime);
    const newEndDT = this._toDateTime(newDate, newEndTime);

    try {
      const row = await prisma.$transaction(async (tx) => {
        const updated = await tx.appointments.update({
          where: { id: appointmentId },
          data: {
            date: newDateObj,
            start_time: newStartDT,
            end_time: newEndDT,
          },
          include: {
            doctors: { select: { id: true, name: true, specialization: true } },
            patients: { select: { id: true, name: true, document_number: true, email: true } },
          },
        });

        const historyAction = [
          'RESCHEDULED',
          `from:${previousDate}T${previousStartTime}-${previousEndTime}`,
          `to:${newDate}T${newStartTime}-${newEndTime}`,
          reason ? `reason:${reason}` : '',
        ]
          .filter(Boolean)
          .join('|');

        await tx.appointment_history.create({
          data: {
            appointment_id: appointmentId,
            action: historyAction,
            performed_by: performedBy ?? null,
          },
        });

        return updated;
      });

      return this._mapRow(row);
    } catch (err) {
      if (err?.code === 'P2002') {
        throw new ConflictError(
          'El médico ya tiene una cita programada en ese horario. Por favor elija otro horario.'
        );
      }
      throw err;
    }
  }

  async updateStatus(id, status, performedBy) {
    const row = await prisma.appointments.update({
      where: { id },
      data: { status },
      include: {
        doctors: { select: { id: true, name: true, specialization: true } },
        patients: { select: { id: true, name: true, document_number: true, email: true } },
      },
    });

    await prisma.appointment_history.create({
      data: {
        appointment_id: id,
        action: status,
        performed_by: performedBy ?? null,
      },
    });

    return this._mapRow(row);
  }

  async cancelWithReason(id, reason, performedBy) {
    const now = new Date();
    const notesValue = `CANCELLATION_REASON: ${reason}`;

    const row = await prisma.appointments.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: notesValue,
      },
      include: {
        doctors: { select: { id: true, name: true, specialization: true } },
        patients: { select: { id: true, name: true, document_number: true, email: true } },
      },
    });

    await prisma.appointment_history.create({
      data: {
        appointment_id: id,
        action: `CANCELLED — ${reason}`,
        performed_by: performedBy ?? null,
      },
    });

    return this._mapRow(row, { cancellationReason: reason, cancelledAt: now });
  }

  async markAsNoShow(id, reason, performedBy) {
    const notesValue = reason
      ? `NO_SHOW_REASON: ${reason}`
      : null;

    const row = await prisma.appointments.update({
      where: { id },
      data: {
        status: 'NO_SHOW',
        ...(notesValue && { notes: notesValue }),
      },
      include: {
        doctors: {
          select: {
            id: true,
            name: true,
            specialization: true,
          },
        },
        patients: {
          select: {
            id: true,
            name: true,
            document_number: true,
            email: true,
          },
        },
      },
    });

    await prisma.appointment_history.create({
      data: {
        appointment_id: id,
        action: reason
          ? `NO_SHOW — ${reason}`
          : 'NO_SHOW',
        performed_by: performedBy ?? null,
      },
    });

    return this._mapRow(row);
  }

  async findAppointmentsForReminder(startWindow, endWindow) {

    const startTime =
      startWindow.toTimeString().split(' ')[0];

    const endTime =
      endWindow.toTimeString().split(' ')[0];

    return prisma.appointments.findMany({
      where: {
        status: 'SCHEDULED',

        date: {
          equals: new Date(
            new Date().toISOString().split('T')[0]
          ),
        },

        start_time: {
          gte: new Date(`1970-01-01T${startTime}`),

          lte: new Date(`1970-01-01T${endTime}`),
        },
      },

      include: {
        patients: true,
        doctors: true,
      },
    });
  }

  async findDailyAgendaByDate(date) {
    return prisma.appointments.findMany({
      where: {
        status: 'SCHEDULED',

        date: {
          equals: new Date(date),
        },
      },

      include: {
        patients: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        doctors: {
          include: {
            users: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },

      orderBy: [
        {
          start_time: 'asc',
        },
      ],
    });
  }
}

export default PrismaAppointmentRepository;