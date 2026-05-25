import PrismaPatientRepository from '../../infrastructure/repositories/patient.repository.js';
import PrismaMedicalRecordRepository from '../../infrastructure/repositories/medicalRecord.repository.js';
import UploadExternalMedicalRecordUseCase from '../../application/use-cases/integration/uploadExternalMedicalRecord.usecase.js';
import { successResponse } from '../../shared/utils/apiResponse.js';
import RiskClassificationService from '../../application/services/riskClassification.service.js';

const patientRepository = new PrismaPatientRepository();
const medicalRecordRepository = new PrismaMedicalRecordRepository();
const riskClassificationService = new RiskClassificationService();

const uploadMedicalRecordUseCase =
    new UploadExternalMedicalRecordUseCase(
        patientRepository,
        medicalRecordRepository,
        riskClassificationService
    );

class IntegrationController {

    async uploadMedicalRecord(req, res, next) {
        try {
            const { patientId, name, documentNumber,birthDate, phone, email, diseaseCount, } = req.body;

            const result = await uploadMedicalRecordUseCase.execute({
                patientId,
                patientData: {
                    name,
                    documentNumber,
                    birthDate,
                    phone,
                    email,
                    diseaseCount:Number(diseaseCount ?? 0),
                },
                file: req.file,
            });

            return successResponse(
                res,
                result,
                'Historial médico recibido correctamente'
            );
        } catch (error) {
            next(error);
        }
    }
}

export default new IntegrationController();