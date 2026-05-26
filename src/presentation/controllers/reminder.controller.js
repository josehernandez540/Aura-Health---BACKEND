import appointmentReminderService from '../../application/services/appointmentReminder.service.js';

class ReminderController {
  async runAppointmentReminders(req, res, next) {
    try {

      const result =
        await appointmentReminderService.sendUpcomingReminders();

      return res.status(200).json({
        success: true,
        message: 'Reminder job ejecutado correctamente',
        data: result,
      });

    } catch (error) {
      next(error);
    }
  }
}

export default new ReminderController();