import prisma from '../../config/database.js';
import TreatmentRepository from '../../domain/repositories/treatment.repository.js';

class PrismaTreatmentRepository extends TreatmentRepository {
    _mapRow(row) {
        if (!row) return null;
        const rawChanges = row.medication_changes ?? [];

        const medicationChanges = rawChanges.map(mc => {
            let parsedNewMed = null;
            try {
                parsedNewMed = typeof mc.new_medication === 'string'
                    ? JSON.parse(mc.new_medication)
                    : mc.new_medication;
            } catch (e) {
                parsedNewMed = mc.new_medication;
            }

            return {
                id: mc.id,
                previousMedication: mc.previous_medication,
                newMedication: parsedNewMed,
                changedBy: mc.changed_by,
                createdAt: mc.created_at
            };
        });

        const medications = medicationChanges
            .map(c => c.newMedication)
            .filter(med => med !== null && med !== undefined);

        return {
            id: row.id,
            patientId: row.patient_id,
            doctorId: row.doctor_id,
            description: row.description,
            medications,
            status: row.status,
            createdAt: row.created_at,
            doctor: row.doctors
                ? { id: row.doctors.id, name: row.doctors.name, specialization: row.doctors.specialization }
                : undefined,
            patient: row.patients
                ? { id: row.patients.id, name: row.patients.name, documentNumber: row.patients.document_number }
                : undefined,
            approvals: row.treatment_approvals ?? [],
            medicationChanges
        };
    }

    async findById(id) {
        const row = await prisma.treatments.findUnique({
            where: { id },
            include: {
                doctors: { select: { id: true, name: true, specialization: true } },
                patients: { select: { id: true, name: true, document_number: true } },
                treatment_approvals: {
                    select: { id: true, approved_by: true, notes: true, approved_at: true },
                    orderBy: { approved_at: 'desc' },
                },
                medication_changes: {
                    select: {
                        id: true,
                        previous_medication: true,
                        new_medication: true,
                        changed_by: true,
                        created_at: true,
                    },
                    orderBy: { created_at: 'asc' },
                },
            },
        });
        return this._mapRow(row);
    }

    async findAll({ page = 1, limit = 20, patientId, doctorId, status } = {}) {
        const skip = (page - 1) * limit;

        const where = {
            ...(patientId && { patient_id: patientId }),
            ...(doctorId && { doctor_id: doctorId }),
            ...(status && { status }),
        };

        const [rows, total] = await Promise.all([
            prisma.treatments.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    doctors: { select: { id: true, name: true, specialization: true } },
                    patients: { select: { id: true, name: true, document_number: true } },
                },
            }),
            prisma.treatments.count({ where }),
        ]);

        return {
            items: rows.map((r) => this._mapRow(r)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findByPatientId(patientId, { page = 1, limit = 20, status } = {}) {
        return this.findAll({ page, limit, patientId, status });
    }

    async create({ patientId, doctorId, description, medications, changedBy }) {
        const row = await prisma.$transaction(async (tx) => {
            const treatment = await tx.treatments.create({
                data: {
                    patient_id: patientId,
                    doctor_id: doctorId,
                    description,
                    status: 'ACTIVE',
                },
                include: {
                    doctors: { select: { id: true, name: true, specialization: true } },
                    patients: { select: { id: true, name: true, document_number: true } },
                },
            });

            if (medications && medications.length > 0) {
                await tx.medication_changes.createMany({
                    data: medications.map((med) => ({
                        treatment_id: treatment.id,
                        previous_medication: null,
                        new_medication: JSON.stringify(med),
                        changed_by: changedBy ?? null,
                    })),
                });
            }

            return treatment;
        });

        return this.findById(row.id);
    }

    async update(id, { description, medications, changedBy }) {
        await prisma.$transaction(async (tx) => {
            if (description !== undefined) {
                await tx.treatments.update({
                    where: { id },
                    data: { description },
                });
            }

            if (medications && medications.length > 0) {
                const current = await tx.medication_changes.findMany({
                    where: { treatment_id: id },
                    orderBy: { created_at: 'desc' },
                });

                const previousMeds = current
                    .filter((c) => c.new_medication !== null)
                    .map((c) => c.new_medication)
                    .join('; ');

                await tx.medication_changes.createMany({
                    data: medications.map((med) => ({
                        treatment_id: id,
                        previous_medication: previousMeds || null,
                        new_medication: JSON.stringify(med),
                        changed_by: changedBy ?? null,
                    })),
                });
            }
        });

        return this.findById(id);
    }

    async updateStatus(id, status) {
        await prisma.treatments.update({
            where: { id },
            data: { status },
        });
        return this.findById(id);
    }
}

export default PrismaTreatmentRepository;