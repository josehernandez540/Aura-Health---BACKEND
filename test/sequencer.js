import Sequencer from '@jest/test-sequencer';

class CustomSequencer extends Sequencer {
  sort(tests) {
    const order = [
      'audit.service.test',
      'audit.wrapper.test',
      'login.usecase.test',
      'createDoctor.schema.test',
      'createDoctor.usecase.test',
      'toggleDoctorStatus.usecase.test',
      'auth.e2e.test',
      'doctorStatus.e2e.test',
    ];

    return [...tests].sort((a, b) => {
      const nameA = a.path.split('/').pop().replace('.js', '');
      const nameB = b.path.split('/').pop().replace('.js', '');
      const idxA = order.indexOf(nameA);
      const idxB = order.indexOf(nameB);
      const posA = idxA === -1 ? -1 : idxA;
      const posB = idxB === -1 ? -1 : idxB;
      return posA - posB;
    });
  }
}

export default CustomSequencer;