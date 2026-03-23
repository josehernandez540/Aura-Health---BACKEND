import Sequencer from '@jest/test-sequencer';

class CustomSequencer extends Sequencer {
  sort(tests) {
    const order = [
      // Utilidades core
      'audit.service.test',
      'audit.wrapper.test',
      // Auth
      'login.usecase.test',
      'changePassword.usecase.test',
      // Schemas
      'createDoctor.schema.test',
      'patient.schema.test',
      // Use cases doctores
      'createDoctor.usecase.test',
      'toggleDoctorStatus.usecase.test',
      // Use cases pacientes
      'createPatient.usecase.test',
      'updatePatient.usecase.test',
      'togglePatientStatus.usecase.test',
      // E2E
      'auth.e2e.test',
      'doctorStatus.e2e.test',
      'patient.e2e.test',
    ];

    return [...tests].sort((a, b) => {
      const nameA = a.path.split('/').pop().replace('.js', '');
      const nameB = b.path.split('/').pop().replace('.js', '');
      const idxA = order.indexOf(nameA);
      const idxB = order.indexOf(nameB);
      const posA = idxA === -1 ? 999 : idxA;
      const posB = idxB === -1 ? 999 : idxB;
      return posA - posB;
    });
  }
}

export default CustomSequencer;