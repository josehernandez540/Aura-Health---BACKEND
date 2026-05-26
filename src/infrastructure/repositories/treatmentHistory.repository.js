import prisma from '../../config/database.js';
import TreatmentHistoryRepository from '../../domain/repositories/treatmentHistory.repository.js';
import { TreatmentHistory } from '../../domain/entities/treatmentHistory.entity.js';

class PrismaTreatmentHistoryRepository extends TreatmentHistoryRepository {

  _map(row) {
    if (!row) return null;

    return new TreatmentHistory({
      id: row.id,
      treatmentId: row.treatment_id,
      version: row.version,
      previousDescription: row.previous_description,
      newDescription: row.new_description,
      previousMedications: row.previous_medications,
      newMedications: row.new_medications,
      changedBy: row.changed_by,
      changeReason: row.change_reason,
      createdAt: row.created_at,
    });
  }

  async getLastVersion(treatmentId) {
    const row = await prisma.treatment_history.findFirst({
      where: {
        treatment_id: treatmentId,
      },
      orderBy: {
        version: 'desc',
      },
    });

    return row?.version ?? 0;
  }

  async create(data) {
    const row = await prisma.treatment_history.create({
      data: {
        treatment_id: data.treatmentId,
        version: data.version,

        previous_description: data.previousDescription,
        new_description: data.newDescription,

        previous_medications: data.previousMedications,
        new_medications: data.newMedications,

        changed_by: data.changedBy,

        change_reason: data.changeReason,
      },
    });

    return this._map(row);
  }

  async findByTreatmentId(treatmentId) {
    const rows = await prisma.treatment_history.findMany({
      where: {
        treatment_id: treatmentId,
      },
      orderBy: {
        version: 'desc',
      },
    });

    return rows.map((r) => this._map(r));
  }
}

export default PrismaTreatmentHistoryRepository;