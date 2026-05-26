import cron from 'node-cron';
import appointmentReminderService from '../../application/services/appointmentReminder.service.js';

cron.schedule('0 * * * *', async () => { // cada hora
// cron.schedule('* * * * *', async () => { // cada minuto
  console.info(
    '[Scheduler] Running appointment reminder job'
  );

  await appointmentReminderService.sendUpcomingReminders();
});