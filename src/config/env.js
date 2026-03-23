import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: process.env.NODE_ENV === "development",
  isProd: process.env.NODE_ENV === "production",
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  databaseUrl: process.env.DATABASE_URL,
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: process.env.SMTP_FROM
  }  
};