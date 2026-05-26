export class Treatment {
  constructor({
    id,
    patientId,
    doctorId,
    description,
    medications,
    status,
    createdAt,
  }) {
    this.id = id;
    this.patientId = patientId;
    this.doctorId = doctorId;
    this.description = description;
    this.medications = medications ?? [];
    this.status = status ?? 'ACTIVE';
    this.createdAt = createdAt;
  }

  static isValidStatus(status) {
    return ['ACTIVE', 'COMPLETED', 'PENDING_APPROVAL'].includes(status);
  }

  isActive() {
    return this.status === 'ACTIVE';
  }

  isCompleted() {
    return this.status === 'COMPLETED';
  }

  isPendingApproval() {
    return this.status === 'PENDING_APPROVAL';
  }

  canBeCompleted() {
    return this.status === 'ACTIVE';
  }
}