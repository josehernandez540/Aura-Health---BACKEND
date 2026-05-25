import fs from 'fs';
import PrismaMedicalRecordRepository from '../../infrastructure/repositories/medicalRecord.repository.js';
import { NotFoundError, AuthorizationError } from '../../shared/errors/errors.js';

const medicalRecordRepository = new PrismaMedicalRecordRepository();

class MedicalRecordController {

    async download(req, res, next) {
        try {

            const { id } = req.params;

            const medicalRecord = await medicalRecordRepository.findById(id);

            if (!medicalRecord) {
                throw new NotFoundError('Archivo no encontrado');
            }

            const filePath = medicalRecord.file_url;

            if (!fs.existsSync(filePath)) {
                throw new NotFoundError('Archivo físico no encontrado');
            }

            res.setHeader(
                'Content-Type',
                'application/pdf'
            );

            const stream = fs.createReadStream(filePath);

            stream.pipe(res);
        } catch (error) {
            next(error);
        }
    }
}

export default new MedicalRecordController();