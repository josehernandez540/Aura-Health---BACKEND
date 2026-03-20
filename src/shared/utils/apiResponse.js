export const successResponse = (res, data, message = "Operación exitosa") => {
  return res.status(200).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

export const errorResponse = (res, statusCode, message, errorCode) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errorCode,
    timestamp: new Date().toISOString(),
  });
};