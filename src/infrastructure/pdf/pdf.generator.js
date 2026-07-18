import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

class PdfGenerator {

    async _loadTemplate() {
        const templatePath = path.join(
            __dirname,
            'templates',
            'clinical-report.template.html'
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

    async generateClinicalReport({
        patient,
        treatments,
    }) {

        const browser = await puppeteer.launch({
            executablePath: '/usr/bin/chromium',
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        try {
            const page = await browser.newPage();
            const rawTemplate = await this._loadTemplate();

            const html =
                this._replace(rawTemplate, {
                    patientName: patient.name,
                    documentNumber: patient.document_number,
                    email: patient.email ?? 'N/A',
                    phone: patient.phone ?? 'N/A',
                    treatments: this._buildTreatments( treatments ),
                });

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
}

export default new PdfGenerator();