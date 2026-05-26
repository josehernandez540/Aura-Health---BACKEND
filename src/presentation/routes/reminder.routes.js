import { Router } from 'express';

import reminderController from '../controllers/reminder.controller.js';

const reminderRouter = Router();

reminderRouter.post(
  '/appointments/run',
  reminderController.runAppointmentReminders
);

export default reminderRouter;