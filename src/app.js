import express, { json } from 'express';
import helmet from "helmet";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import routes from './presentation/routes/index.js';
import swaggerUi from 'swagger-ui-express';
import { errorMiddleware } from './presentation/middlewares/error.middleware.js';
import { env } from './config/env.js';
import { swaggerSpec } from './config/swagger.js';

export const createApp = () => {
    const app = express();

    app.use(cors());
    app.use(json());
    app.use(helmet());
    app.use(cookieParser());

    if (env.isDev) {
        app.use(morgan('dev'));
        app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec,{
            customSiteTitle: 'Aura Health API Docs',
            swaggerOptions: {
                persistAuthorization: true,
            },
        }));
        app.get('/api/docs-json', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.send(swaggerSpec);
        });
    }

    app.use("/api", routes);

    app.use(errorMiddleware);

    return app;
};