import {
    NotFoundError,
} from '../../../shared/errors/errors.js';

class GenerateClinicalReportUseCase {

    constructor({
        patientRepository,
        treatmentRepository,
        reportRepository,
        auditService,
        pdfGenerator,
    }) {

        this.patientRepository =
            patientRepository;

        this.treatmentRepository =
            treatmentRepository;

        this.reportRepository =
            reportRepository;

        this.auditService =
            auditService;

        this.pdfGenerator =
            pdfGenerator;

    }

    async execute({
        patientId,
        generatedBy,
    }) {

        const patient = await this.patientRepository.findById(patientId);

        if (!patient) {
            throw new NotFoundError(
                'Paciente no encontrado'
            );
        }

        const treatmentsResult = await this.treatmentRepository.findByPatientId(patientId, {
            limit: 100,
        });

        const treatments = treatmentsResult.items;

        const pdfBuffer = await this.pdfGenerator.generateClinicalReport({
            patient,
            treatments,
        });

        const report =  await this.reportRepository.create({
            generated_by: generatedBy,
            type: 'CLINICAL',
            entity_type: 'PATIENT',
            entity_id: patientId,
        });

        await this.auditService.log({
            userId: generatedBy,
            action: 'GENERATE_CLINICAL_REPORT',
            entityType: 'PATIENT',
            entityId: patientId,
            metadata: { reportId: report.id,},
            severity: 'INFO',
        });

        return {
            patient,
            pdfBuffer,
        };

    }

}

export default GenerateClinicalReportUseCase;