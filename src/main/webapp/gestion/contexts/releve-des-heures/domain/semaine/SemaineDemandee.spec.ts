import { JourCalendaire } from './JourCalendaire';
import { semaineDemandee } from './SemaineDemandee';

const JOUR_COURANT = new JourCalendaire('2026-09-17');

describe('semaineDemandee', () => {
  it('should read the week containing today when the URL names none', () => {
    const demandee = semaineDemandee({ annee: undefined, semaine: undefined, jour: undefined }, JOUR_COURANT);

    expect(demandee).toMatchObject({ estConnue: true, semaine: { annee: 2026, numero: 38 } });
  });

  it('should read the week the URL names', () => {
    const demandee = semaineDemandee({ annee: '2025', semaine: '12', jour: undefined }, JOUR_COURANT);

    expect(demandee).toMatchObject({ estConnue: true, semaine: { annee: 2025, numero: 12 } });
  });

  it.each([[{ annee: '2026', semaine: undefined, jour: undefined }], [{ annee: undefined, semaine: '38', jour: undefined }]])(
    'should refuse %o, a week named only in part',
    parametres => {
      const demandee = semaineDemandee(parametres, JOUR_COURANT);

      expect(demandee).toEqual({ estConnue: false });
    },
  );

  it.each(['abc', '2026.5', '+38', '0x26', '38 ', '-1', '', '20266'])('should refuse the year %s, which is not a plain number', annee => {
    const demandee = semaineDemandee({ annee, semaine: '38', jour: undefined }, JOUR_COURANT);

    expect(demandee).toEqual({ estConnue: false });
  });

  it.each(['abc', '38.5', '-1', ''])('should refuse the week %s, which is not a plain number', semaine => {
    const demandee = semaineDemandee({ annee: '2026', semaine, jour: undefined }, JOUR_COURANT);

    expect(demandee).toEqual({ estConnue: false });
  });

  it('should refuse a week the year does not carry', () => {
    const demandee = semaineDemandee({ annee: '2025', semaine: '53', jour: undefined }, JOUR_COURANT);

    expect(demandee).toEqual({ estConnue: false });
  });

  it('should refuse a year outside the calendar this front serves', () => {
    const demandee = semaineDemandee({ annee: '1999', semaine: '1', jour: undefined }, JOUR_COURANT);

    expect(demandee).toEqual({ estConnue: false });
  });

  it.each([
    ['2026-09-21', 2026, 39],
    ['2026-09-20', 2026, 38],
    ['2027-01-01', 2026, 53],
    ['2000-01-03', 2000, 1],
    ['2999-12-26', 2999, 52],
  ])('should read the week holding %s when the URL names that day alone', (jour, annee, numero) => {
    const demandee = semaineDemandee({ annee: undefined, semaine: undefined, jour }, JOUR_COURANT);

    expect(demandee).toMatchObject({ estConnue: true, semaine: { annee, numero } });
  });

  it('should read the week the URL names rather than the one holding the day', () => {
    const demandee = semaineDemandee({ annee: '2025', semaine: '12', jour: '2026-09-21' }, JOUR_COURANT);

    expect(demandee).toMatchObject({ estConnue: true, semaine: { annee: 2025, numero: 12 } });
  });

  it.each(['abc', '', '2026-02-30', '2026-9-21', '21/09/2026'])('should refuse the day %s, which is not a day of the calendar', jour => {
    const demandee = semaineDemandee({ annee: undefined, semaine: undefined, jour }, JOUR_COURANT);

    expect(demandee).toEqual({ estConnue: false });
  });

  it.each(['1999-12-31', '2000-01-01', '1999-12-27', '0050-06-01', '0100-01-01', '3000-06-01', '9999-12-31', '2999-12-31', '3000-01-01'])(
    'should refuse the day %s, held by a week outside the calendar this front serves, without throwing',
    jour => {
      const demandee = semaineDemandee({ annee: undefined, semaine: undefined, jour }, JOUR_COURANT);

      expect(demandee).toEqual({ estConnue: false });
    },
  );

  it.each([[{ annee: '2026', semaine: undefined, jour: '2026-09-21' }], [{ annee: undefined, semaine: '39', jour: '2026-09-21' }]])(
    'should refuse %o, a week named only in part even with a day',
    parametres => {
      const demandee = semaineDemandee(parametres, JOUR_COURANT);

      expect(demandee).toEqual({ estConnue: false });
    },
  );
});
