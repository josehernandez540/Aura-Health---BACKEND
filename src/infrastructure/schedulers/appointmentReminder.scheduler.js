import cron from 'node-cron';
import appointmentReminderService from '../../application/services/appointmentReminder.service.js';

// cron.schedule('* * * * *', async () => { // cada minuto
cron.schedule('0 * * * *', async () => { // cada hora
    console.info(
      '[Scheduler] Running appointment reminder job'
    );

    await appointmentReminderService.sendUpcomingReminders();
  },
  { timezone: 'America/Bogota', }
);
