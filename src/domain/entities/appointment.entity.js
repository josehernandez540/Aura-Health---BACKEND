export class Appointment {
  constructor({ id, doctorId, patientId, date, startTime, endTime, status }) {
    this.id = id;
    this.doctorId = doctorId;
    this.patientId = patientId;
    this.date = date;
    this.startTime = startTime;
    this.endTime = endTime;
    this.status = status ?? 'SCHEDULED';
  }

  canBeCancelled() {
    return this.status === 'SCHEDULED';
  }

  canBeCompleted() {
    return this.status === 'SCHEDULED';
  }

  static isValidTimeRange(startTime, endTime) {
    return endTime > startTime;
  }

  isScheduled() { return this.status === 'SCHEDULED'; }
  isCancelled() { return this.status === 'CANCELLED'; }
  isCompleted() { return this.status === 'COMPLETED'; }
}