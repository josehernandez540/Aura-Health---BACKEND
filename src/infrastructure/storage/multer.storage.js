import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { ValidationError } from '../../shared/errors/errors.js';

const uploadPath = 'private-storage/medical-records';

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },

    filename: (req, file, cb) => {
        const sanitizedOriginalName = file.originalname.replace(/\s+/g, '_');
        const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${sanitizedOriginalName}`;
        cb(null, uniqueName);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['application/pdf'];

    if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(
            new ValidationError('Solo se permiten archivos PDF'),
            false
        );
    }

    cb(null, true);
};

export const medicalRecordUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
});