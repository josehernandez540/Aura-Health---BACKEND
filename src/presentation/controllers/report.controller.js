import PrismaPatientRepository from '../../infrastructure/repositories/patient.repository.js';
import PrismaTreatmentRepository from '../../infrastructure/repositories/treatment.repository.js';
import ReportRepository from '../../infrastructure/repositories/report.repository.js';
import AuditRepository from '../../infrastructure/repositories/audit.repository.js';
import AuditService from '../../application/services/audit.service.js';
import pdfGenerator from '../../infrastructure/pdf/pdf.generator.js';
import GenerateClinicalReportUseCase from '../../application/use-cases/report/generateClinicalReport.usecase.js';

const patientRepository = new PrismaPatientRepository();
const treatmentRepository = new PrismaTreatmentRepository();
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

class ReportController {

    async generate(req, res, next) {
        try {
            const { patientId } = req.params;
            const generatedBy = req.user.id;

            const result = await generateClinicalReportUseCase.execute({
                patientId,
                generatedBy,
            });

            res.setHeader( 'Content-Type','application/pdf');
            res.setHeader( 'Content-Disposition',`attachment; filename=clinical-report-${patientId}.pdf`);

            return res.send(result.pdfBuffer);

        } catch (error) {
            next(error);
        }
    }
}

export default new ReportController();