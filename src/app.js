import express, { json } from 'express';
import helmet from "helmet";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { errorMiddleware } from './presentation/middlewares/error.middleware.js';
import { env } from './config/env.js';

export const createApp = () => {
    const app = express();

    app.use(cors());
    app.use(json());
    app.use(helmet());
    app.use(cookieParser());

    if (env.isDev) {
        app.use(morgan('dev'));
    }

    // routes aquí
    // app.use("/api", routes);

    app.use(errorMiddleware);

    return app;
};