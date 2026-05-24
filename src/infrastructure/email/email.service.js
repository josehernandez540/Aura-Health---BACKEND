import nodemailer from 'nodemailer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {

  _transport = null;

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


  async _loadTemplate(templateName) {
    const templatePath = path.join(__dirname, 'templates', templateName);
    try {
      return await fs.readFile(templatePath, 'utf8');
    } catch (error) {
      console.error(`Error leyendo template ${templateName}:`, error);
      return null;
    }
  }

  _replacePlaceholders(template, vars) {
    return Object.entries(vars).reduce(
      (html, [key, value]) => html.replace(new RegExp(`{{${key}}}`, 'g'), value ?? ''),
      template
    );
  }

  async sendWelcomeEmail({ to, name, tempPassword }) {
    try {
      const transport = await this._getTransport();
      const from = env.smtp.from ?? '"Aura Health" <no-reply@aurahealth.com>';

      const rawTemplate = await this._loadTemplate('welcome-email.html');

      const html = rawTemplate
        ? this._replacePlaceholders(rawTemplate, { name, email: to, password: tempPassword })
        : `<h2>Bienvenido ${name}</h2><p>Tu clave es: ${tempPassword}</p>`;

      const info = await transport.sendMail({
        from,
        to,
        subject: 'Bienvenido a Aura Health — Credenciales de acceso',
        text: [
          `Hola ${name},`,
          'Tu cuenta en Aura Health ha sido creada exitosamente.',
          `Correo: ${to}`,
          `Contraseña: ${tempPassword}`,
          'Por seguridad, cambia tu contraseña en el primer inicio de sesión.',
        ].join('\n'),
        html,
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

  async sendAppointmentCancellationEmail({
    to,
    patientName,
    date,
    startTime,
    endTime,
    doctorName,
    specialization,
    reason,
  }) {
    try {
      const transport = await this._getTransport();
      const from = env.smtp.from ?? '"Aura Health" <no-reply@aurahealth.com>';

      const rawTemplate = await this._loadTemplate('cancellation-email.html');
      const html = rawTemplate
        ? this._replacePlaceholders(rawTemplate, {
          patientName,
          date,
          startTime,
          endTime,
          doctorName,
          specialization: specialization ?? 'No especificada',
          reason,
        })
        : `<p>Hola ${patientName}, tu cita del ${date} ha sido cancelada. Motivo: ${reason}</p>`;

      const textBody = [
        `Hola ${patientName},`,
        '',
        'Tu cita médica ha sido CANCELADA por el equipo administrativo de Aura Health.',
        '',
        `Fecha    : ${date}`,
        `Horario  : ${startTime} – ${endTime}`,
        `Médico   : ${doctorName}`,
        `Motivo   : ${reason}`,
        '',
        'Si deseas reagendar, comunícate con administración: admin@aurahealth.com',
      ].join('\n');

      const info = await transport.sendMail({
        from,
        to,
        subject: 'Aura Health — Tu cita ha sido cancelada',
        text: textBody,
        html,
      });

      if (nodemailer.getTestMessageUrl(info)) {
        console.info('Cancellation email preview URL:', nodemailer.getTestMessageUrl(info));
      }

      return info;
    } catch (error) {
      console.error('Error enviando cancellation email:', error);
      throw error;
    }
  }
}

export default new EmailService();