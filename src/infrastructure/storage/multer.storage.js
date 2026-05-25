import multer from 'multer';
import fs from 'fs';
import path from 'path';

const uploadPath = 'uploads/medical-records';

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },

    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

        cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
        return cb(new Error('Solo se permiten archivos PDF'));
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