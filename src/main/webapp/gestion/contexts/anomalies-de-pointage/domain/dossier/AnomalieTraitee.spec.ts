import { anomalieTraitee } from './AnomalieTraitee';

describe('Anomaly processed once neither a conflict nor an automatic end remains', () => {
  it('should be processed when neither a conflict nor an automatic end remains', () => {
    expect(anomalieTraitee({ enConflit: false, finAutomatique: false })).toBe(true);
  });

  it.each([
    { enConflit: true, finAutomatique: false },
    { enConflit: false, finAutomatique: true },
    { enConflit: true, finAutomatique: true },
  ])('should stay open when the conflict is $enConflit and the automatic end is $finAutomatique', dossier => {
    expect(anomalieTraitee(dossier)).toBe(false);
  });
});
