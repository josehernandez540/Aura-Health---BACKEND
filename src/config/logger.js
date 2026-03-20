import winston from "winston";
import { env } from "./env.js";

const format = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: env.isDev ? "debug" : "info",
  format,
  transports: [
    new winston.transports.Console(),
  ],
});