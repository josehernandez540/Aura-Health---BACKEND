import prisma from '../src/config/database.js';

const SEED_TAG = '[SEED-HIST]';
const DAYS_BACK = 110;
const SLOT_TIMES = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
];

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const addMinutes = (time, minutes) => {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const pickStatus = (daysAgo) => {
  const roll = Math.random();
  if (daysAgo <= 2) {
    if (roll < 0.55) return 'SCHEDULED';
    if (roll < 0.75) return 'COMPLETED';
    if (roll < 0.9) return 'CANCELLED';
    return 'NO_SHOW';
  }
  if (roll < 0.68) return 'COMPLETED';
  if (roll < 0.85) return 'CANCELLED';
  return 'NO_SHOW';
};

async function main() {
  const existing = await prisma.appointments.count({ where: { notes: { startsWith: SEED_TAG } } });
  if (existing > 0) {
    console.log(`Already seeded (${existing} [SEED-HIST] appointments found). Nothing to do.`);
    return;
  }

  const doctors = await prisma.doctors.findMany({ where: { is_active: true }, select: { id: true } });
  const patients = await prisma.patients.findMany({ where: { is_active: true }, select: { id: true } });
  const admin = await prisma.users.findFirst({ where: { roles: { name: 'ADMIN' } }, select: { id: true } });

  if (!doctors.length || !patients.length) {
    console.error('No active doctors/patients found — nothing to seed.');
    process.exitCode = 1;
    return;
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const rows = [];

  for (let daysAgo = DAYS_BACK; daysAgo >= 0; daysAgo--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - daysAgo);
    if (date.getUTCDay() === 0) continue; // clinic closed Sundays
    const dateStr = date.toISOString().slice(0, 10);

    for (const doctor of doctors) {
      const appointmentCount = randomInt(0, 4);
      const usedSlots = new Set();

      for (let i = 0; i < appointmentCount; i++) {
        let slot = randomFrom(SLOT_TIMES);
        let attempts = 0;
        while (usedSlots.has(slot) && attempts < SLOT_TIMES.length) {
          slot = randomFrom(SLOT_TIMES);
          attempts += 1;
        }
        if (usedSlots.has(slot)) continue;
        usedSlots.add(slot);

        const status = pickStatus(daysAgo);
        // the partial unique index only guards SCHEDULED rows — safe by construction
        // since usedSlots already dedupes per doctor/day regardless of status.

        rows.push({
          doctor_id: doctor.id,
          patient_id: randomFrom(patients).id,
          date,
          start_time: new Date(`${dateStr}T${slot}:00.000Z`),
          end_time: new Date(`${dateStr}T${addMinutes(slot, 30)}:00.000Z`),
          status,
          created_by: admin?.id ?? null,
          notes: `${SEED_TAG} Cita generada para poblar analíticas`,
        });
      }
    }
  }

  console.log(`Inserting ${rows.length} historical appointments...`);
  const BATCH_SIZE = 200;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await prisma.appointments.createMany({ data: rows.slice(i, i + BATCH_SIZE) });
    console.log(`  ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }

  console.log('Done.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
