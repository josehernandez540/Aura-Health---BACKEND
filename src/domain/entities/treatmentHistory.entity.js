export class TreatmentHistory {
  constructor({
    id,
    treatmentId,
    version,
    previousDescription,
    newDescription,
    previousMedications,
    newMedications,
    changedBy,
    changeReason,
    createdAt,
  }) {
    this.id = id;
    this.treatmentId = treatmentId;
    this.version = version;

    this.previousDescription = previousDescription;
    this.newDescription = newDescription;

    this.previousMedications = previousMedications ?? [];
    this.newMedications = newMedications ?? [];

    this.changedBy = changedBy;
    this.changeReason = changeReason;

    this.createdAt = createdAt;
  }
}