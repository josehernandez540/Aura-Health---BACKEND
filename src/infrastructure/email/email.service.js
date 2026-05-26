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

  async _getEmailConfig() {
    return {
      transport: await this._getTransport(),
      from: env.smtp.from ?? '"Aura Health" <no-reply@aurahealth.com>',
    };
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

  _formatDate(date) {
    return new Date(date).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }

  _buildAppointmentLabel(date, startTime, endTime) {
    return `${this._formatDate(date)} de ${startTime} a ${endTime}`;
  }

  _logPreview(info, type = 'Email') {
    const previewUrl = nodemailer.getTestMessageUrl(info);

    if (previewUrl) {
      console.info(`${type} preview URL:`, previewUrl);
    }
  }

  _logError(context, error) {
    console.error(`Error ${context}:`, error);
  }

  async sendWelcomeEmail({
    to,
    name,
    tempPassword,
  }) {
    try {
      const { transport, from } = await this._getEmailConfig();

      const rawTemplate = await this._loadTemplate('welcome-email.html');

      const html = rawTemplate
        ? this._replacePlaceholders(rawTemplate, { name, email: to, password: tempPassword })
        : `<h2>Bienvenido ${name}</h2><p>Tu clave es: ${tempPassword}</p>`;

      const text = [
        `Hola ${name},`,
        '',
        'Tu cuenta en Aura Health ha sido creada exitosamente.',
        '',
        `Correo: ${to}`,
        `Contraseña temporal: ${tempPassword}`,
        '',
        'Por seguridad, cambia tu contraseña al iniciar sesión.',
      ].join('\n');

      const info = await transport.sendMail({
        from,
        to,
        subject: 'Aura Health — Bienvenido',
        text,
        html,
      });

      this._logPreview(info, 'Welcome email');

      return info;
    } catch (error) {
      this._logError('enviando email de bienvenida', error);
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
      const { transport, from } = await this._getEmailConfig();

      const rawTemplate = await this._loadTemplate(
        'cancellation-email.html'
      );

      const html = rawTemplate
        ? this._replacePlaceholders(rawTemplate, {
          patientName,
          date,
          startTime,
          endTime,
          doctorName,
          specialization:
            specialization ?? 'No especificada',
          reason,
        })
        : `
          <p>
            Hola ${patientName},
            tu cita médica ha sido cancelada.
          </p>
        `;

      const text = [
        `Hola ${patientName},`,
        '',
        'Tu cita médica ha sido CANCELADA.',
        '',
        `Fecha    : ${date}`,
        `Horario  : ${startTime} - ${endTime}`,
        `Médico   : ${doctorName}`,
        `Motivo   : ${reason}`,
        '',
        'Si deseas reagendar, comunícate con administración.',
      ].join('\n');

      const info = await transport.sendMail({
        from,
        to,
        subject: 'Aura Health — Tu cita fue cancelada',
        text,
        html,
      });

      this._logPreview(info, 'Cancellation email');

      return info;
    } catch (error) {
      this._logError(
        'enviando email de cancelación',
        error
      );

      throw error;
    }
  }

  async sendAppointmentRescheduleEmail({
    to,
    patientName,
    doctorName,
    previousDate,
    previousStartTime,
    previousEndTime,
    newDate,
    newStartTime,
    newEndTime,
    reason,
  }) {
    try {
      const { transport, from } = await this._getEmailConfig();

      const previousAppointment =
        this._buildAppointmentLabel(
          previousDate,
          previousStartTime,
          previousEndTime
        );

      const newAppointment =
        this._buildAppointmentLabel(
          newDate,
          newStartTime,
          newEndTime
        );

      const rawTemplate = await this._loadTemplate(
        'reschedule-email.html'
      );

      const html = rawTemplate
        ? this._replacePlaceholders(rawTemplate, {
          patientName,
          doctorName,
          previousAppointment,
          newAppointment,
          reason: reason ?? 'No especificado',
        })
        : `
          <p>
            Hola ${patientName},
            tu cita fue reprogramada.
          </p>
        `;

      const text = [
        `Hola ${patientName},`,
        '',
        `Tu cita con ${doctorName} ha sido reprogramada.`,
        '',
        `Cita anterior: ${previousAppointment}`,
        `Nueva cita: ${newAppointment}`,
        '',
        reason ? `Motivo: ${reason}` : '',
        '',
        'Si tienes preguntas, comunícate con nosotros.',
      ]
        .filter(Boolean)
        .join('\n');

      const info = await transport.sendMail({
        from,
        to,
        subject: 'Aura Health — Tu cita fue reprogramada',
        text,
        html,
      });

      this._logPreview(info, 'Reschedule email');

      return info;
    } catch (error) {
      this._logError(
        'enviando email de reprogramación',
        error
      );

      throw error;
    }
  }

  async sendAppointmentReminderEmail({
    to,
    patientName,
    doctorName,
    date,
    startTime,
    endTime,
  }) {
    try {
      const { transport, from } = await this._getEmailConfig();

      const appointmentLabel =
        this._buildAppointmentLabel(
          date,
          startTime,
          endTime
        );

      const rawTemplate = await this._loadTemplate(
        'appointment-reminder-email.html'
      );

      const html = rawTemplate
        ? this._replacePlaceholders(rawTemplate, {
          patientName,
          doctorName,
          appointmentLabel,
        })
        : `
        <p>
          Hola ${patientName},
          tienes una cita programada mañana.
        </p>
      `;

      const text = [
        `Hola ${patientName},`,
        '',
        'Te recordamos tu cita médica programada.',
        '',
        `Médico: ${doctorName}`,
        `Horario: ${appointmentLabel}`,
        '',
        'Aura Health',
      ].join('\n');

      const info = await transport.sendMail({
        from,
        to,
        subject: 'Aura Health — Recordatorio de cita',
        text,
        html,
      });

      this._logPreview(info, 'Reminder email');

      return info;
    } catch (error) {
      this._logError(
        'enviando email recordatorio',
        error
      );

      throw error;
    }
  }

}

export default new EmailService();