export class Doctor {
    constructor({ id, name, specialization, licenseNumber, isActive,
        statusChangedAt, statusChangedBy }) {
        this.id = id;
        this.name = name;
        this.specialization = specialization;
        this.licenseNumber = licenseNumber;
        this.isActive = isActive ?? true;
        this.statusChangedAt = statusChangedAt;
        this.statusChangedBy = statusChangedBy;
    }

    static isValidStatus(status) {
        return ['ACTIVE', 'INACTIVE'].includes(status);
    }

    canAttendAppointments() {
        return this.isActive === true;
    }

    wouldChangeStatus(newStatus) {
        const targetActive = newStatus === 'ACTIVE';
        return targetActive !== this.isActive;
    }
}