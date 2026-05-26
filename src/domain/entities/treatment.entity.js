export class Treatment {
  constructor({
    id,
    patientId,
    doctorId,
    description,
    medications,
    status,
    createdAt,
    requiresApproval,
    approvedBy,
    approvedAt,
  }) {
    this.id = id;
    this.patientId = patientId;
    this.doctorId = doctorId;
    this.description = description;
    this.medications = medications ?? [];
    this.status = status ?? 'ACTIVE';
    this.createdAt = createdAt;
    this.requiresApproval = requiresApproval ?? false;
    this.approvedBy = approvedBy;
    this.approvedAt = approvedAt;
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