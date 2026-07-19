import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

class PdfGenerator {

    async _loadTemplate(fileName = 'clinical-report.template.html') {
        const templatePath = path.join(
            __dirname,
            'templates',
            fileName
        );

        return fs.readFile(
            templatePath,
            'utf8'
        );
    }

    _replace(template, vars) {
        return Object.entries(vars).reduce(
            (html, [key, value]) =>
                html.replace(
                    new RegExp(`{{${key}}}`, 'g'),
                    value ?? ''
                ),
            template
        );
    }

    _buildTreatments(treatments) {
        if (!treatments.length) {
            return `
                <div class="card">
                    El paciente no posee tratamientos registrados.
                </div>
            `;
        }

        return treatments.map(
            (treatment, index) => {
                const medications = treatment.medications?.length
                        ? `
                            <ul class="medication-list">
                                ${treatment.medications.map(
                                            (med) =>
                                                `<li>${typeof med === 'object'
                                                    ? JSON.stringify(med)
                                                    : med
                                                }</li>`
                                        ).join('')}
                            </ul>
                        `
                        : '<p>No hay medicamentos registrados.</p>';
                return `
                    <div class="treatment">

                        <div class="treatment-title">
                        Tratamiento #${index + 1}
                        </div>

                        <p>
                        <strong>Descripción:</strong>
                        ${treatment.description}
                        </p>

                        <p>
                        <strong>Estado:</strong>
                        ${treatment.status}
                        </p>

                        <p>
                        <strong>Médico:</strong>
                        ${treatment.doctor?.name ?? 'N/A'}
                        </p>

                        <p>
                        <strong>Especialidad:</strong>
                        ${treatment.doctor?.specialization ??
                                'N/A'
                                }
                        </p>

                        <p>
                        <strong>Fecha:</strong>
                        ${new Date(
                                    treatment.createdAt
                                ).toLocaleDateString('es-CO')}
                        </p>

                        <div>
                        <strong>Medicamentos:</strong>
                        ${medications}
                        </div>

                    </div>
                `;
            }
        ).join('');
    }

    async _renderPdf(html) {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        try {
            const page = await browser.newPage();

            await page.setContent(html, {
                waitUntil: 'networkidle0',
            });

            return await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px',
                },
            });
        } finally {
            await browser.close();
        }
    }

    async generateClinicalReport({
        patient,
        treatments,
    }) {
        const rawTemplate = await this._loadTemplate('clinical-report.template.html');

        const html =
            this._replace(rawTemplate, {
                patientName: patient.name,
                documentNumber: patient.document_number,
                email: patient.email ?? 'N/A',
                phone: patient.phone ?? 'N/A',
                treatments: this._buildTreatments( treatments ),
            });

        return this._renderPdf(html);
    }

    _buildMetricCards(metrics) {
        return `
            <div class="metric-card">
                <div class="metric-value">${metrics.totalAppointments}</div>
                <div class="metric-label">Citas</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${metrics.totalPatients}</div>
                <div class="metric-label">Pacientes</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${metrics.totalTreatments}</div>
                <div class="metric-label">Tratamientos</div>
            </div>
        `;
    }

    _buildAppointmentsTable(appointments) {
        if (!appointments.length) {
            return '<div class="card">No hay citas registradas para los filtros seleccionados.</div>';
        }

        const rows = appointments.map((apt) => `
            <tr>
                <td>${new Date(apt.date).toLocaleDateString('es-CO')}</td>
                <td>${apt.patient?.name ?? 'N/A'}</td>
                <td>${apt.doctor?.name ?? 'N/A'}</td>
                <td>${apt.status}</td>
            </tr>
        `).join('');

        const truncatedNote = appointments.length >= 200
            ? '<p class="note">Se muestran las primeras 200 citas que coinciden con los filtros.</p>'
            : '';

        return `
            <table class="data-table">
                <thead>
                    <tr><th>Fecha</th><th>Paciente</th><th>Médico</th><th>Estado</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            ${truncatedNote}
        `;
    }

    _buildTreatmentsTable(treatments) {
        if (!treatments.length) {
            return '<div class="card">No hay tratamientos registrados para los filtros seleccionados.</div>';
        }

        const rows = treatments.map((t) => `
            <tr>
                <td>${new Date(t.createdAt).toLocaleDateString('es-CO')}</td>
                <td>${t.patient?.name ?? 'N/A'}</td>
                <td>${t.doctor?.name ?? 'N/A'}</td>
                <td>${t.status}</td>
            </tr>
        `).join('');

        const truncatedNote = treatments.length >= 200
            ? '<p class="note">Se muestran los primeros 200 tratamientos que coinciden con los filtros.</p>'
            : '';

        return `
            <table class="data-table">
                <thead>
                    <tr><th>Fecha</th><th>Paciente</th><th>Médico</th><th>Estado</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            ${truncatedNote}
        `;
    }

    async generateConsolidatedReport({
        doctorLabel,
        patientLabel,
        dateRangeLabel,
        metrics,
        appointments,
        treatments,
    }) {
        const rawTemplate = await this._loadTemplate('consolidated-report.template.html');

        const html =
            this._replace(rawTemplate, {
                doctorLabel,
                patientLabel,
                dateRangeLabel,
                generatedAt: new Date().toLocaleString('es-CO'),
                metricCards: this._buildMetricCards(metrics),
                appointmentsTable: this._buildAppointmentsTable(appointments),
                treatmentsTable: this._buildTreatmentsTable(treatments),
            });

        return this._renderPdf(html);
    }
}

export default new PdfGenerator();