import { logger } from "../../config/logger.js";
import { errorResponse } from "../../shared/utils/apiResponse.js";

export const errorMiddleware = (err, req, res, next) => {

  const statusCode = err.statusCode || 500;
  const message = err.message || "Error interno del servidor";
  const errorCode = err.errorCode || "INTERNAL_SERVER_ERROR";

  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  return errorResponse(res, statusCode, message, errorCode);
};