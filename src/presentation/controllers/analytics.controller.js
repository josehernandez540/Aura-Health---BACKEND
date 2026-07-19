import AnalyticsRepository from '../../infrastructure/repositories/analytics.repository.js';
import { successResponse } from '../../shared/utils/apiResponse.js';

const analyticsRepository = new AnalyticsRepository();

const ALLOWED_RANGES = [7, 30, 90];

const resolveRange = (query) => {
    const days = ALLOWED_RANGES.includes(Number(query.days)) ? Number(query.days) : 30;

    const endDate = new Date();
    endDate.setUTCHours(23, 59, 59, 999);

    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
    startDate.setUTCHours(0, 0, 0, 0);

    return { days, startDate, endDate };
};

class AnalyticsController {
    async overview(req, res, next) {
        try {
            const { days, startDate, endDate } = resolveRange(req.query);

            const [stats, appointmentsByDay, statusDistribution, bySpecialty, weeklyHeatmap, doctorPerformance] =
                await Promise.all([
                    analyticsRepository.getStats({ startDate, endDate }),
                    analyticsRepository.getAppointmentsByDay({ startDate, endDate }),
                    analyticsRepository.getStatusDistribution({ startDate, endDate }),
                    analyticsRepository.getAppointmentsBySpecialty({ startDate, endDate }),
                    analyticsRepository.getWeeklyHeatmap({ weeks: 12 }),
                    analyticsRepository.getDoctorPerformance({ startDate, endDate }),
                ]);

            return successResponse(res, {
                range: { days, startDate, endDate },
                stats,
                appointmentsByDay,
                statusDistribution,
                bySpecialty,
                weeklyHeatmap,
                doctorPerformance,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new AnalyticsController();
