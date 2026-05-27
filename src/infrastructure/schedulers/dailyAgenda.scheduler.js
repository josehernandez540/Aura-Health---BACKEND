import cron from 'node-cron';
import dailyAgendaService from '../../application/services/dailyAgenda.service.js';

cron.schedule('0 6 * * *', async () => {
        console.info('[Scheduler] Running daily agenda job');
        await dailyAgendaService.sendDailyAgenda();
    },
    { timezone: 'America/Bogota', }
);