import { MoisCalendaire } from './MoisCalendaire';
import { SemaineISO } from './SemaineISO';

describe('MoisCalendaire', () => {
  it.each([
    [new SemaineISO(2026, 36), new MoisCalendaire(2026, 8)],
    [new SemaineISO(2026, 53), new MoisCalendaire(2026, 12)],
    [new SemaineISO(2026, 1), new MoisCalendaire(2025, 12)],
  ])('should place week %o in the month of its Monday', (semaine, mois) => {
    const moisDeLaSemaine = MoisCalendaire.deLaSemaine(semaine);

    expect(moisDeLaSemaine).toEqual(mois);
  });

  it('should list the twelve months of a year from January', () => {
    const mois = MoisCalendaire.deLAnnee(2026);

    expect(mois.map(unMois => unMois.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it.each([0, 13, 1.5])('should refuse month %s', numero => {
    const construction = (): MoisCalendaire => new MoisCalendaire(2026, numero);

    expect(construction).toThrow(`Le mois ${String(numero)} n’existe pas.`);
  });

  it.each([
    [new MoisCalendaire(2026, 9), true],
    [new MoisCalendaire(2025, 9), false],
    [new MoisCalendaire(2026, 10), false],
  ])('should compare months by year and number', (autre, attendu) => {
    const memeMois = new MoisCalendaire(2026, 9).estLeMeme(autre);

    expect(memeMois).toBe(attendu);
  });
});
