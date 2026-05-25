import { ValidationError } from '../../shared/errors/errors.js';

class RiskClassificationService {
    calculate(diseaseCount) {
        if ( diseaseCount === undefined || diseaseCount === null) {
            throw new ValidationError(
                'diseaseCount es requerido'
            );
        }

        if (diseaseCount < 0) {
            throw new ValidationError(
                'diseaseCount no puede ser negativo'
            );
        }
        
        if (diseaseCount <= 3) return 'LOW';
        if (diseaseCount <= 5) return 'MEDIUM';
        return 'HIGH';
    }
}

export default RiskClassificationService;