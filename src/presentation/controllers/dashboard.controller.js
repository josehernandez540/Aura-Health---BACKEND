import PrismaAppointmentRepository from '../../infrastructure/repositories/appointment.repository.js';
import PrismaDoctorRepository from '../../infrastructure/repositories/doctor.repository.js';
import PrismaPatientRepository from '../../infrastructure/repositories/patient.repository.js';
import AnalyticsRepository from '../../infrastructure/repositories/analytics.repository.js';
import AuditRepository from '../../infrastructure/repositories/audit.repository.js';
import notificationRepository from '../../infrastructure/repositories/notification.repository.js';

const appointmentRepository = new PrismaAppointmentRepository();
const doctorRepository = new PrismaDoctorRepository();
const patientRepository = new PrismaPatientRepository();
const analyticsRepository = new AnalyticsRepository();
const auditRepository = new AuditRepository();

const formatNotification = (n) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    status: n.status,
    isRead: !!n.read_at,
    createdAt: n.created_at,
});

const formatAuditEntry = (log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    createdAt: log.createdAt,
    user: log.user ? { email: log.user.email, role: log.user.role } : null,
});

const monthRange = () => {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const endOfMonth = new Date();
    return { startOfMonth, endOfMonth };
};

const startOfWeek = () => {
    const now = new Date();
    const mondayOffset = (now.getUTCDay() + 6) % 7;
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    monday.setUTCDate(monday.getUTCDate() - mondayOffset);
    return monday;
};

class DashboardController {
    async overview(req, res, next) {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const { startOfMonth, endOfMonth } = monthRange();

            if (req.user.role === 'DOCTOR') {
                const doctor = await doctorRepository.findByUserId(req.user.userId);

                if (!doctor) {
                    return res.status(200).json({
                        success: true,
                        data: { role: 'DOCTOR', stats: null, todayAppointments: [], recentActivity: [] },
                    });
                }

                const [todayResult, weekResult, monthStats, notifications] = await Promise.all([
                    appointmentRepository.findAll({ doctorId: doctor.id, date: today, limit: 50 }),
                    appointmentRepository.findAll({
                        doctorId: doctor.id,
                        dateFrom: startOfWeek().toISOString().slice(0, 10),
                        dateTo: today,
                        limit: 1,
                    }),
                    analyticsRepository.getStats({ startDate: startOfMonth, endDate: endOfMonth, doctorId: doctor.id }),
                    notificationRepository.findByUser(req.user.userId, { limit: 5 }),
                ]);

                return res.status(200).json({
                    success: true,
                    data: {
                        role: 'DOCTOR',
                        stats: {
                            appointmentsToday: todayResult.total,
                            appointmentsThisWeek: weekResult.total,
                            completedThisMonth: monthStats.completed,
                            noShowThisMonth: monthStats.noShow,
                            attendanceRate: monthStats.total
                                ? Math.round((monthStats.completed / monthStats.total) * 100)
                                : 0,
                        },
                        todayAppointments: todayResult.items
                            .sort((a, b) => a.startTime.localeCompare(b.startTime))
                            .map((apt) => ({
                                id: apt.id,
                                startTime: apt.startTime,
                                endTime: apt.endTime,
                                status: apt.status,
                                patient: apt.patient ? { id: apt.patient.id, name: apt.patient.name } : null,
                            })),
                        recentActivity: notifications.items.map(formatNotification),
                    },
                });
            }

            const [totalPatients, totalDoctors, todayResult, monthStats, recentAudit] = await Promise.all([
                patientRepository.findAll({ limit: 1, onlyActive: true }),
                doctorRepository.findAll({ limit: 1 }),
                appointmentRepository.findAll({ date: today, limit: 1 }),
                analyticsRepository.getStats({ startDate: startOfMonth, endDate: endOfMonth }),
                auditRepository.findAll({ limit: 8 }),
            ]);

            return res.status(200).json({
                success: true,
                data: {
                    role: 'ADMIN',
                    stats: {
                        totalPatients: totalPatients.total,
                        totalDoctors: totalDoctors.total,
                        appointmentsToday: todayResult.total,
                        appointmentsThisMonth: monthStats.total,
                        completedThisMonth: monthStats.completed,
                        cancelledThisMonth: monthStats.cancelled,
                    },
                    todayAppointments: [],
                    recentActivity: recentAudit.items.map(formatAuditEntry),
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new DashboardController();
