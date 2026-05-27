import PrismaAppointmentRepository from '../../infrastructure/repositories/appointment.repository.js';
import notificationRepository from '../../infrastructure/repositories/notification.repository.js';
import emailService from '../../infrastructure/email/email.service.js';

const appointmentRepository =
    new PrismaAppointmentRepository();

class DailyAgendaService {

    _formatTime(dateObj) {
        if (!dateObj) return '';

        return dateObj.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC',
        });
    }

    async sendDailyAgenda() {
        console.info( '[DailyAgenda] Starting daily agenda emails' );
        const today = new Date().toISOString().split('T')[0];
        const appointments = await appointmentRepository.findDailyAgendaByDate(today);

        if (!appointments.length) {
            console.info('[DailyAgenda] No appointments found');
            return;
        }

        const groupedByDoctor = new Map();
        for (const appointment of appointments) {
            const doctorId = appointment.doctors.id;

            if (!groupedByDoctor.has(doctorId)) {
                groupedByDoctor.set(doctorId, {
                    doctor: appointment.doctors,
                    appointments: [],
                });
            }

            groupedByDoctor.get(doctorId).appointments.push(appointment);
        }

        for (const [, data] of groupedByDoctor) {
            try {
                const doctor = data.doctor;
                const doctorEmail = doctor.users?.email;

                if (!doctorEmail) {
                    continue;
                }

                await emailService.sendDailyAgendaEmail({
                    to: doctorEmail,
                    doctorName: doctor.name,
                    appointments: data.appointments.map(
                        (appointment) => ({
                            patientName: appointment.patients.name,
                            startTime: this._formatTime( appointment.start_time ),
                            endTime: this._formatTime( appointment.end_time ),
                            notes: appointment.notes,
                        })
                    ),
                });

                await notificationRepository.create({
                    user_id: doctor.users.id,
                    type: 'DAILY_AGENDA',
                    message: `Daily agenda sent to doctor ${doctor.id}`,
                    status: 'SENT',
                    entity_type: 'DOCTOR',
                    entity_id: doctor.id,
                });

                console.info(
                    `[DailyAgenda] Agenda sent to ${doctor.name}`
                );

            } catch (error) {
                console.error(
                    `[DailyAgenda] Error sending agenda`,
                    error
                );
            }
        }
    }
}

export default new DailyAgendaService();