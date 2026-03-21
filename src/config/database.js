import { PrismaClient } from '../generated/prisma/index.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { logger } from './logger.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })


export const connectDB = async () => {
    try {
        await prisma.$connect();
        logger.info('Connected to the database');
    } catch (error) {
        logger.error('Error connecting to the database: ', error);
        process.exit(1);
    }
};

export default prisma;