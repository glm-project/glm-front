import { readNatureAnomalieDemandee } from './NatureAnomalieDemandee';

describe('Nature of the anomalies requested by an address', () => {
  it('should request the automatic ends when the address names no nature', () => {
    expect(readNatureAnomalieDemandee(null)).toBe('FIN_AUTOMATIQUE');
  });

  it.each(['CONFLIT', 'FIN_AUTOMATIQUE'] as const)('should accept the nature %s named by the address', nature => {
    expect(readNatureAnomalieDemandee(nature)).toBe(nature);
  });

  it.each(['CONFLITS', 'conflit', 'fin_automatique', '', ' CONFLIT', 'AUTRE'])('should refuse the unknown nature "%s"', nature => {
    expect(readNatureAnomalieDemandee(nature)).toBeUndefined();
  });
});
