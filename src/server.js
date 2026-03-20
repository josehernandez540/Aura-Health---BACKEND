import 'dotenv/config';
import { createApp } from './app.js';
import { connectDB } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

const startServer = async () => {
    await connectDB();

    const app = createApp();

    app.listen(env.port, () => {
        logger.info(`Server running on port ${env.port}`);
    });
};

startServer();