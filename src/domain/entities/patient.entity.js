export class Patient {
    constructor({ id, name, documentNumber, birthDate, phone, email,
        isActive, createdAt, updatedAt }) {
        this.id = id;
        this.name = name;
        this.documentNumber = documentNumber;
        this.birthDate = birthDate;
        this.phone = phone;
        this.email = email;
        this.isActive = isActive ?? true;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    canScheduleAppointments() {
        return this.isActive === true;
    }

    static isValidStatus(status) {
        return ['ACTIVE', 'INACTIVE'].includes(status);
    }

    isAdult() {
        if (!this.birthDate) return null;
        const today = new Date();
        const birth = new Date(this.birthDate);
        const age = today.getFullYear() - birth.getFullYear();
        return age >= 18;
    }
}