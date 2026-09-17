import { JourCalendaire } from './JourCalendaire';
import { semaineDemandee } from './SemaineDemandee';

const JOUR_COURANT = new JourCalendaire('2026-09-17');

describe('semaineDemandee', () => {
  it('should read the week containing today when the URL names none', () => {
    const demandee = semaineDemandee({ annee: undefined, semaine: undefined }, JOUR_COURANT);

    expect(demandee).toMatchObject({ estConnue: true, semaine: { annee: 2026, numero: 38 } });
  });

  it('should read the week the URL names', () => {
    const demandee = semaineDemandee({ annee: '2025', semaine: '12' }, JOUR_COURANT);

    expect(demandee).toMatchObject({ estConnue: true, semaine: { annee: 2025, numero: 12 } });
  });

  it.each([[{ annee: '2026', semaine: undefined }], [{ annee: undefined, semaine: '38' }]])(
    'should refuse %o, a week named only in part',
    parametres => {
      const demandee = semaineDemandee(parametres, JOUR_COURANT);

      expect(demandee).toEqual({ estConnue: false });
    },
  );

  it.each(['abc', '2026.5', '+38', '0x26', '38 ', '-1', '', '20266'])('should refuse the year %s, which is not a plain number', annee => {
    const demandee = semaineDemandee({ annee, semaine: '38' }, JOUR_COURANT);

    expect(demandee).toEqual({ estConnue: false });
  });

  it.each(['abc', '38.5', '-1', ''])('should refuse the week %s, which is not a plain number', semaine => {
    const demandee = semaineDemandee({ annee: '2026', semaine }, JOUR_COURANT);

    expect(demandee).toEqual({ estConnue: false });
  });

  it('should refuse a week the year does not carry', () => {
    const demandee = semaineDemandee({ annee: '2025', semaine: '53' }, JOUR_COURANT);

    expect(demandee).toEqual({ estConnue: false });
  });

  it('should refuse a year outside the calendar this front serves', () => {
    const demandee = semaineDemandee({ annee: '1999', semaine: '1' }, JOUR_COURANT);

    expect(demandee).toEqual({ estConnue: false });
  });
});
