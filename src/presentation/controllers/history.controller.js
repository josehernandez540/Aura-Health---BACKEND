import AuditService from '../../application/services/audit.service.js';
import PrismaPatientRepository from '../../infrastructure/repositories/patient.repository.js';
import AuditRepository from '../../infrastructure/repositories/audit.repository.js';
import { NotFoundError } from '../../shared/errors/errors.js';
import { successResponse } from '../../shared/utils/apiResponse.js';
import { AuditActions } from '../../domain/constants/audit-actions.js';

const patientRepository = new PrismaPatientRepository();

const auditRepository = new AuditRepository();

const auditService = new AuditService(auditRepository);

class HistoryController {

    async findByPatient(req, res, next) {
        try {

            const { patientId } = req.params;

            const patient = await patientRepository.findById(patientId);

            if (!patient) {
                throw new NotFoundError('Paciente no encontrado');
            }

            await auditService.log({
                userId: req.user.userId,
                action: AuditActions.PATIENT_HISTORY_VIEWED,
                entityType: 'PATIENT',
                entityId: patientId,
                metadata: {
                    accessedAt: new Date().toISOString(),
                },
            });

            return successResponse(res, {
                patient: {
                    id: patient.id,
                    name: patient.name,
                    documentNumber: patient.document_number,
                },

                medicalRecords: patient.medical_records.map(record => ({
                    id: record.id,
                    source: record.source,
                    fileUrl: `/medical-records/${record.id}/download`,
                    createdAt: record.created_at,
                })),
            });

        } catch (error) {
            next(error);
        }
    }
}

export default new HistoryController();