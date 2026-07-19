import prisma from '../../config/database.js';

const dayKey = (date) => new Date(date).toISOString().slice(0, 10);

class AnalyticsRepository {
  async getStats({ startDate, endDate, doctorId }) {
    const where = {
      date: { gte: startDate, lte: endDate },
      ...(doctorId && { doctor_id: doctorId }),
    };

    const [total, completed, noShow, cancelled] = await Promise.all([
      prisma.appointments.count({ where }),
      prisma.appointments.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.appointments.count({ where: { ...where, status: 'NO_SHOW' } }),
      prisma.appointments.count({ where: { ...where, status: 'CANCELLED' } }),
    ]);

    return { total, completed, noShow, cancelled };
  }

  async getAppointmentsByDay({ startDate, endDate }) {
    const rows = await prisma.appointments.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { date: true },
    });

    const counts = new Map();
    rows.forEach((row) => {
      const key = dayKey(row.date);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const days = [];
    const cursor = new Date(startDate);
    const end = new Date(endDate);
    while (cursor <= end) {
      const key = dayKey(cursor);
      days.push({ date: key, count: counts.get(key) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return days;
  }

  async getStatusDistribution({ startDate, endDate }) {
    const rows = await prisma.appointments.groupBy({
      by: ['status'],
      where: { date: { gte: startDate, lte: endDate } },
      _count: true,
    });

    return rows.map((row) => ({ status: row.status, count: row._count }));
  }

  async getAppointmentsBySpecialty({ startDate, endDate }) {
    const rows = await prisma.appointments.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { doctors: { select: { specialization: true } } },
    });

    const counts = new Map();
    rows.forEach((row) => {
      const specialty = row.doctors?.specialization ?? 'Sin especialidad';
      counts.set(specialty, (counts.get(specialty) ?? 0) + 1);
    });

    return [...counts.entries()]
      .map(([specialty, count]) => ({ specialty, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getWeeklyHeatmap({ weeks = 12 } = {}) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Align to Monday..Sunday weeks so every column is a full calendar week
    // and each row consistently maps to the same weekday.
    const mondayOffset = (today.getUTCDay() + 6) % 7;
    const currentMonday = new Date(today);
    currentMonday.setUTCDate(currentMonday.getUTCDate() - mondayOffset);

    const startDate = new Date(currentMonday);
    startDate.setUTCDate(startDate.getUTCDate() - (weeks - 1) * 7);

    const endDate = new Date(currentMonday);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    endDate.setUTCHours(23, 59, 59, 999);

    const rows = await prisma.appointments.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { date: true },
    });

    const counts = new Map();
    rows.forEach((row) => {
      const key = dayKey(row.date);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const days = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const key = dayKey(cursor);
      days.push({ date: key, count: counts.get(key) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return days;
  }

  async getDoctorPerformance({ startDate, endDate }) {
    const rows = await prisma.appointments.groupBy({
      by: ['doctor_id', 'status'],
      where: { date: { gte: startDate, lte: endDate } },
      _count: true,
    });

    const doctorIds = [...new Set(rows.map((r) => r.doctor_id))];
    if (!doctorIds.length) return [];

    const doctors = await prisma.doctors.findMany({
      where: { id: { in: doctorIds } },
      select: { id: true, name: true, specialization: true },
    });
    const doctorById = new Map(doctors.map((d) => [d.id, d]));

    const byDoctor = new Map();
    rows.forEach((row) => {
      const entry = byDoctor.get(row.doctor_id) ?? { total: 0, completed: 0, noShow: 0 };
      entry.total += row._count;
      if (row.status === 'COMPLETED') entry.completed += row._count;
      if (row.status === 'NO_SHOW') entry.noShow += row._count;
      byDoctor.set(row.doctor_id, entry);
    });

    return [...byDoctor.entries()]
      .map(([doctorId, stats]) => {
        const doctor = doctorById.get(doctorId);
        return {
          doctorId,
          name: doctor?.name ?? 'Médico desconocido',
          specialization: doctor?.specialization ?? 'N/A',
          total: stats.total,
          completed: stats.completed,
          noShow: stats.noShow,
          attendanceRate: stats.total ? Math.round((stats.completed / stats.total) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }
}

export default AnalyticsRepository;
