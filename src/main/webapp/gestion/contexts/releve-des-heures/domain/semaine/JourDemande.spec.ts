import { jourDemande } from './JourDemande';
import { SemaineISO } from './SemaineISO';

const SEMAINE = new SemaineISO(2026, 38);

describe('jourDemande', () => {
  it('should name no day when the URL names none', () => {
    expect(jourDemande(undefined, SEMAINE)).toEqual({ kind: 'ABSENT' });
  });

  it('should read the day of the week the URL names', () => {
    expect(jourDemande('2026-09-16', SEMAINE)).toMatchObject({ kind: 'NOMME', jour: { value: '2026-09-16' } });
  });

  it.each(['2026-09-14', '2026-09-20'])('should accept %s, an end of the week', jour => {
    expect(jourDemande(jour, SEMAINE)).toMatchObject({ kind: 'NOMME', jour: { value: jour } });
  });

  it.each(['2026-09-13', '2026-09-21', '2025-09-16'])('should refuse %s, a day the week does not hold', jour => {
    expect(jourDemande(jour, SEMAINE)).toEqual({ kind: 'REFUSE' });
  });

  it.each(['abc', '', '2026-02-30', '2026-9-16', '16/09/2026', ' 2026-09-16'])(
    'should refuse %s, which is not a day of the calendar',
    jour => {
      expect(jourDemande(jour, SEMAINE)).toEqual({ kind: 'REFUSE' });
    },
  );
});
