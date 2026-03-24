import AuditRepository from '../../infrastructure/repositories/audit.repository.js';
import { successResponse } from '../../shared/utils/apiResponse.js';

const auditRepository = new AuditRepository();

class AuditController {
    async findAll(req, res, next) {
        try {
            const {
                page = 1,
                limit = 20,
                userId,
                action,
                entityType,
                entityId,
                severity,
                startDate,
                endDate,
            } = req.query;

            const result = await auditRepository.findAll({
                page: Number(page),
                limit: Math.min(Number(limit), 100),
                userId,
                action,
                entityType,
                entityId,
                severity,
                startDate,
                endDate,
            });

            return successResponse(res, result, 'Logs de auditoría obtenidos exitosamente');
        } catch (error) {
            next(error);
        }
    }
}

export default new AuditController();