import PrismaPatientRepository from '../../infrastructure/repositories/patient.repository.js';
import PrismaMedicalRecordRepository from '../../infrastructure/repositories/medicalRecord.repository.js';
import UploadExternalMedicalRecordUseCase from '../../application/use-cases/integration/uploadExternalMedicalRecord.usecase.js';
import { successResponse } from '../../shared/utils/apiResponse.js';

const patientRepository = new PrismaPatientRepository();
const medicalRecordRepository = new PrismaMedicalRecordRepository();

const uploadMedicalRecordUseCase =
    new UploadExternalMedicalRecordUseCase(
        patientRepository,
        medicalRecordRepository
    );

class IntegrationController {
    async uploadMedicalRecord(req, res, next) {
        try {
            const { patientId } = req.body;

            const result = await uploadMedicalRecordUseCase.execute({
                patientId,
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