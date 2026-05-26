import PrismaAppointmentRepository from '../../infrastructure/repositories/appointment.repository.js';
import notificationRepository from '../../infrastructure/repositories/notification.repository.js';
import emailService from '../../infrastructure/email/email.service.js';

const appointmentRepository = new PrismaAppointmentRepository();

class AppointmentReminderService {
  _combineDateAndTime(date, time) {
    const appointmentDate = new Date(date);

    const timeValue = new Date(time);

    appointmentDate.setUTCHours(
      timeValue.getUTCHours(),
      timeValue.getUTCMinutes(),
      0,
      0
    );

    return appointmentDate;
  }

  async sendUpcomingReminders() {
    const now = new Date();

    const startWindow = new Date(now.getTime() + 4 * 60 * 1000);

    const endWindow = new Date(now.getTime() + 6 * 60 * 1000);

    const appointments =
      await appointmentRepository.findAppointmentsForReminder(
        startWindow,
        endWindow
      );

    for (const appointment of appointments) {
      try {
        if (!appointment.patients?.email) {
          continue;
        }

        const appointmentDateTime = this._combineDateAndTime(
          appointment.date,
          appointment.start_time
        );

        if (
          appointmentDateTime < startWindow ||
          appointmentDateTime > endWindow
        ) {
          continue;
        }

        const alreadySent =
          await notificationRepository.findReminderSent(
            appointment.id
          );

        if (alreadySent) {
          continue;
        }

        const notification =
          await notificationRepository.create({
            user_id: appointment.created_by,
            type: 'APPOINTMENT_REMINDER',
            message: `Reminder sent for appointment ${appointment.id}`,
            status: 'PENDING',
            entity_type: 'APPOINTMENT',
            entity_id: appointment.id,
          });

        await emailService.sendAppointmentReminderEmail({
          to: appointment.patients.email,
          patientName: appointment.patients.name,
          doctorName: appointment.doctors.name,
          date: appointment.date,
          startTime: appointment.start_time,
          endTime: appointment.end_time,
        });

        await notificationRepository.markAsSent(
          notification.id
        );

        console.info(
          `Reminder sent for appointment ${appointment.id}`
        );
      } catch (error) {
        console.error(
          `Error sending reminder for appointment ${appointment.id}`,
          error
        );
      }
    }
  }
}

export default new AppointmentReminderService();