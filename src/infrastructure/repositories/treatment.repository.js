import prisma from '../../config/database.js';
import TreatmentRepository from '../../domain/repositories/treatment.repository.js';
import { Treatment } from '../../domain/entities/treatment.entity.js';

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
                // Legacy free-text entry (e.g. "Losartán 50mg") instead of a structured {name, dose} object
                parsedNewMed = mc.new_medication ? { name: mc.new_medication, dose: '' } : null;
            }

            return {
                id: mc.id,
                previousMedication: mc.previous_medication,
                newMedication: parsedNewMed,
                changedBy: mc.changed_by,
                createdAt: mc.created_at,
            };
        });

        const latestVersion = (row.treatment_history ?? [])[0];

        const medications = latestVersion
            ? latestVersion.new_medications
            : medicationChanges
                .map(c => c.newMedication)
                .filter(med => med !== null && med !== undefined);

        const treatment = new Treatment({
            id: row.id,
            patientId: row.patient_id,
            doctorId: row.doctor_id,
            description: row.description,
            medications,
            status: row.status,
            createdAt: row.created_at,
            requiresApproval: row.requires_approval,
            approvedBy: row.approved_by,
            approvedAt: row.approved_at,
        });

        treatment.doctor = row.doctors
            ? {
                id: row.doctors.id,
                name: row.doctors.name,
                specialization: row.doctors.specialization,
            }
            : undefined;

        treatment.patient = row.patients
            ? {
                id: row.patients.id,
                name: row.patients.name,
                documentNumber: row.patients.document_number,
            }
            : undefined;

        treatment.approvals = row.treatment_approvals ?? [];
        treatment.medicationChanges = medicationChanges;

        return treatment;

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
                treatment_history: {
                    select: { new_medications: true },
                    orderBy: { version: 'desc' },
                    take: 1,
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
                    medication_changes: {
                        select: { new_medication: true },
                        orderBy: { created_at: 'asc' },
                    },
                    treatment_history: {
                        select: { new_medications: true },
                        orderBy: { version: 'desc' },
                        take: 1,
                    },
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

    async create({ patientId, doctorId, description, medications, changedBy, requiresApproval, status }) {
        const row = await prisma.$transaction(async (tx) => {
            const treatment = await tx.treatments.create({
                data: {
                    patient_id: patientId,
                    doctor_id: doctorId,
                    description,
                    status,
                    requires_approval: requiresApproval,
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

    async approve(id, approvedBy, notes) {
        await prisma.$transaction(async (tx) => {

            await tx.treatment_approvals.create({
                data: {
                    treatment_id: id,
                    approved_by: approvedBy,
                    notes,
                },
            });

            await tx.treatments.update({
                where: { id },
                data: {
                    status: 'ACTIVE',
                    approved_by: approvedBy,
                    approved_at: new Date(),
                },
            });
        });

        return this.findById(id);
    }
}

export default PrismaTreatmentRepository;