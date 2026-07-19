import fs from 'fs';
import PrismaPatientRepository from '../../infrastructure/repositories/patient.repository.js';
import PrismaTreatmentRepository from '../../infrastructure/repositories/treatment.repository.js';
import PrismaDoctorRepository from '../../infrastructure/repositories/doctor.repository.js';
import PrismaAppointmentRepository from '../../infrastructure/repositories/appointment.repository.js';
import ReportRepository from '../../infrastructure/repositories/report.repository.js';
import AuditRepository from '../../infrastructure/repositories/audit.repository.js';
import AuditService from '../../application/services/audit.service.js';
import pdfGenerator from '../../infrastructure/pdf/pdf.generator.js';
import GenerateClinicalReportUseCase from '../../application/use-cases/report/generateClinicalReport.usecase.js';
import GenerateConsolidatedReportUseCase from '../../application/use-cases/report/generateConsolidatedReport.usecase.js';
import { NotFoundError, ValidationError } from '../../shared/errors/errors.js';
import { slugify, todayStamp } from '../../shared/utils/filename.js';

const patientRepository = new PrismaPatientRepository();
const treatmentRepository = new PrismaTreatmentRepository();
const doctorRepository = new PrismaDoctorRepository();
const appointmentRepository = new PrismaAppointmentRepository();
const reportRepository = new ReportRepository();
const auditRepository = new AuditRepository();
const auditService = new AuditService(auditRepository);
const generateClinicalReportUseCase =
    new GenerateClinicalReportUseCase({
        patientRepository,
        treatmentRepository,
        reportRepository,
        auditService,
        pdfGenerator,
    });
const generateConsolidatedReportUseCase =
    new GenerateConsolidatedReportUseCase({
        doctorRepository,
        patientRepository,
        appointmentRepository,
        treatmentRepository,
        reportRepository,
        auditService,
        pdfGenerator,
    });

const REPORT_TYPE_LABELS = {
    CONSOLIDATED: 'Resumen de Citas',
    CLINICAL: 'Reporte Clínico Individual',
};

const mapHistoryRow = (row) => {
    let fileSizeBytes = null;
    if (row.file_url && fs.existsSync(row.file_url)) {
        fileSizeBytes = fs.statSync(row.file_url).size;
    }

    return {
        id: row.id,
        type: row.type,
        title: REPORT_TYPE_LABELS[row.type] || row.type,
        createdAt: row.created_at,
        generatedBy: row.users
            ? { email: row.users.email, doctorName: row.users.doctors?.name ?? null }
            : null,
        fileSizeBytes,
        downloadable: Boolean(fileSizeBytes),
    };
};

const parseConsolidatedFilters = (query) => {
    const { doctorId, patientId, startDate, endDate } = query;

    if (startDate && endDate && startDate > endDate) {
        throw new ValidationError('La fecha de fin no puede ser anterior a la fecha de inicio');
    }

    return {
        doctorId: doctorId || undefined,
        patientId: patientId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
    };
};

class ReportController {

    async generate(req, res, next) {
        try {
            const { patientId } = req.params;
            const generatedBy = req.user.userId;

            if (req.user.role === 'DOCTOR') {
                const doctor = await doctorRepository.findByUserId(generatedBy);
                const assigned = doctor && (await patientRepository.isAssignedToDoctor(patientId, doctor.id));

                if (!assigned) {
                    throw new NotFoundError('Paciente no encontrado');
                }
            }

            const result = await generateClinicalReportUseCase.execute({
                patientId,
                generatedBy,
            });

            const fileName = `reporte-clinico-${slugify(result.patient.name) || patientId}-${todayStamp()}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            return res.send(result.pdfBuffer);

        } catch (error) {
            next(error);
        }
    }

    async previewConsolidated(req, res, next) {
        try {
            const filters = parseConsolidatedFilters(req.query);
            const summary = await generateConsolidatedReportUseCase.preview(filters);

            return res.status(200).json({ success: true, data: summary });
        } catch (error) {
            next(error);
        }
    }

    async generateConsolidated(req, res, next) {
        try {
            const filters = parseConsolidatedFilters(req.query);
            const generatedBy = req.user.userId;

            const result = await generateConsolidatedReportUseCase.execute({
                ...filters,
                generatedBy,
            });

            const fileName = `reporte-clinico-${todayStamp()}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            return res.send(result.pdfBuffer);
        } catch (error) {
            next(error);
        }
    }

    async history(req, res, next) {
        try {
            const { page = 1, limit = 5 } = req.query;

            const [{ items, total, totalPages }, stats] = await Promise.all([
                reportRepository.findAll({ page: Number(page), limit: Math.min(Number(limit), 50) }),
                reportRepository.countStats(),
            ]);

            return res.status(200).json({
                success: true,
                data: {
                    items: items.map(mapHistoryRow),
                    total,
                    page: Number(page),
                    totalPages,
                    stats,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async downloadHistorical(req, res, next) {
        try {
            const { id } = req.params;

            const report = await reportRepository.findById(id);

            if (!report || !report.file_url) {
                throw new NotFoundError('Reporte no encontrado');
            }

            if (!fs.existsSync(report.file_url)) {
                throw new NotFoundError('El archivo del reporte ya no está disponible');
            }

            const fileName = `reporte-clinico-${new Date(report.created_at).toISOString().slice(0, 10)}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            fs.createReadStream(report.file_url).pipe(res);
        } catch (error) {
            next(error);
        }
    }
}

export default new ReportController();