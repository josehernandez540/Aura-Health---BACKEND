import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
  constructor() {
    this._transport = null;
  }

  async _getTransport() {
    if (this._transport) return this._transport;
    
    if (env.smtp.host) {
      this._transport = nodemailer.createTransport({
        host: env.smtp.host,
        port: Number(env.smtp.port ?? 587),
        secure: env.smtp.secure === 'true',
        auth: {
          user: env.smtp.auth.user,
          pass: env.smtp.auth.pass,
        },
      });
    } else {

      const testAccount = await nodemailer.createTestAccount();
      this._transport = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    return this._transport;
  }

  async sendWelcomeEmail({ to, name, tempPassword }) {
    try {
      const transport = await this._getTransport();
      const from = env.smtp.from ?? '"Aura Health" <no-reply@aurahealth.com>';

      const htmlBody = await this._buildHtmlBody(name, to, tempPassword);

      const info = await transport.sendMail({
        from,
        to,
        subject: 'Bienvenido a Aura Health — Credenciales de acceso',
        text: this._buildTextBody(name, to, tempPassword),
        html: htmlBody,
      });

      if (nodemailer.getTestMessageUrl(info)) {
        console.info('Email preview URL:', nodemailer.getTestMessageUrl(info));
      }
      
      return info;
    } catch (error) {
      console.error('Error enviando email:', error);
      throw error;
    }
  }

  _buildTextBody(name, email, password) {
    return [
      `Hola ${name},`,
      'Tu cuenta en Aura Health ha sido creada exitosamente.',
      `Correo: ${email}`,
      `Contraseña: ${password}`,
      'Por seguridad, cambia tu contraseña en el primer inicio de sesión.',
    ].join('\n');
  }

  async _buildHtmlBody(name, email, password) {
    const templatePath = path.join(__dirname, 'templates', 'welcome-email.html');
    
    try {
      let content = await fs.readFile(templatePath, 'utf8');

      content = content.replace(/{{name}}/g, name);
      content = content.replace(/{{email}}/g, email);
      content = content.replace(/{{password}}/g, password);

      return content;
    } catch (error) {
      console.error('Error leyendo el template de email:', error);
      
      return `<h2>Bienvenido ${name}</h2><p>Tu clave es: ${password}</p>`;
    }
  }
}

export default new EmailService();