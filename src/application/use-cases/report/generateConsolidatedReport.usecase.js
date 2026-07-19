import fs from 'fs';
import path from 'path';
import { NotFoundError } from '../../../shared/errors/errors.js';

const REPORTS_STORAGE_DIR = 'private-storage/reports';

if (!fs.existsSync(REPORTS_STORAGE_DIR)) {
    fs.mkdirSync(REPORTS_STORAGE_DIR, { recursive: true });
}

class GenerateConsolidatedReportUseCase {

    constructor({
        doctorRepository,
        patientRepository,
        appointmentRepository,
        treatmentRepository,
        reportRepository,
        auditService,
        pdfGenerator,
    }) {
        this.doctorRepository = doctorRepository;
        this.patientRepository = patientRepository;
        this.appointmentRepository = appointmentRepository;
        this.treatmentRepository = treatmentRepository;
        this.reportRepository = reportRepository;
        this.auditService = auditService;
        this.pdfGenerator = pdfGenerator;
    }

    async _resolveLabels({ doctorId, patientId }) {
        const [doctor, patient] = await Promise.all([
            doctorId ? this.doctorRepository.findById(doctorId) : null,
            patientId ? this.patientRepository.findById(patientId) : null,
        ]);

        if (doctorId && !doctor) throw new NotFoundError('Médico no encontrado');
        if (patientId && !patient) throw new NotFoundError('Paciente no encontrado');

        return {
            doctorLabel: doctor ? doctor.name : 'Todos los médicos',
            patientLabel: patient ? patient.name : 'Todos los pacientes',
        };
    }

    _dateRangeLabel({ startDate, endDate }) {
        if (startDate && endDate) return `${startDate} — ${endDate}`;
        if (startDate) return `Desde ${startDate}`;
        if (endDate) return `Hasta ${endDate}`;
        return 'Histórico completo';
    }

    async _computeMetrics({ doctorId, patientId, startDate, endDate }) {
        const [appointmentsResult, treatmentsResult, totalPatients] = await Promise.all([
            this.appointmentRepository.findAll({
                doctorId,
                patientId,
                dateFrom: startDate,
                dateTo: endDate,
                limit: 200,
            }),
            this.treatmentRepository.findAll({
                doctorId,
                patientId,
                dateFrom: startDate,
                dateTo: endDate,
                limit: 200,
            }),
            this.appointmentRepository.countDistinctPatients({
                doctorId,
                patientId,
                dateFrom: startDate,
                dateTo: endDate,
            }),
        ]);

        return {
            appointments: appointmentsResult.items,
            treatments: treatmentsResult.items,
            metrics: {
                totalAppointments: appointmentsResult.total,
                totalTreatments: treatmentsResult.total,
                totalPatients,
            },
        };
    }

    async preview({ doctorId, patientId, startDate, endDate }) {
        const [{ doctorLabel, patientLabel }, { metrics }] = await Promise.all([
            this._resolveLabels({ doctorId, patientId }),
            this._computeMetrics({ doctorId, patientId, startDate, endDate }),
        ]);

        return {
            doctorLabel,
            patientLabel,
            dateRangeLabel: this._dateRangeLabel({ startDate, endDate }),
            metrics,
        };
    }

    async execute({ doctorId, patientId, startDate, endDate, generatedBy }) {
        const { doctorLabel, patientLabel } = await this._resolveLabels({ doctorId, patientId });
        const { appointments, treatments, metrics } = await this._computeMetrics({
            doctorId,
            patientId,
            startDate,
            endDate,
        });

        const pdfBuffer = await this.pdfGenerator.generateConsolidatedReport({
            doctorLabel,
            patientLabel,
            dateRangeLabel: this._dateRangeLabel({ startDate, endDate }),
            metrics,
            appointments,
            treatments,
        });

        const report = await this.reportRepository.create({
            generated_by: generatedBy,
            type: 'CONSOLIDATED',
            entity_type: 'SYSTEM',
            entity_id: null,
        });

        const filePath = path.join(REPORTS_STORAGE_DIR, `${report.id}.pdf`);
        fs.writeFileSync(filePath, pdfBuffer);
        await this.reportRepository.updateFileUrl(report.id, filePath);

        await this.auditService.log({
            userId: generatedBy,
            action: 'GENERATE_CONSOLIDATED_REPORT',
            entityType: 'SYSTEM',
            entityId: null,
            metadata: { reportId: report.id, doctorId: doctorId ?? null, patientId: patientId ?? null, startDate: startDate ?? null, endDate: endDate ?? null },
            severity: 'INFO',
        });

        return { pdfBuffer };
    }
}

export default GenerateConsolidatedReportUseCase;
