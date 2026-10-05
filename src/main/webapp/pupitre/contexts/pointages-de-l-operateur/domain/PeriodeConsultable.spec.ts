import { PeriodeConsultable } from './PeriodeConsultable';
import { JourCalendaire } from './semaine/JourCalendaire';
import { MoisCalendaire } from './semaine/MoisCalendaire';
import { SemaineISO } from './semaine/SemaineISO';

const periode = new PeriodeConsultable(new JourCalendaire('2026-10-08'));

describe('PeriodeConsultable', () => {
  it('should start from the week holding today', () => {
    const semaineCourante = periode.semaineCourante;

    expect(semaineCourante).toEqual(new SemaineISO(2026, 41));
  });

  it.each([
    [new SemaineISO(2026, 41), new SemaineISO(2026, 40)],
    [new SemaineISO(2026, 1), new SemaineISO(2025, 52)],
    [new SemaineISO(2025, 42), new SemaineISO(2025, 41)],
    [new SemaineISO(2025, 41), new SemaineISO(2025, 41)],
  ])('should go back from %o to %o, never beyond one year', (semaine, precedente) => {
    const resultat = periode.precedente(semaine);

    expect(resultat).toEqual(precedente);
  });

  it.each([
    [new SemaineISO(2026, 40), new SemaineISO(2026, 41)],
    [new SemaineISO(2025, 52), new SemaineISO(2026, 1)],
    [new SemaineISO(2026, 41), new SemaineISO(2026, 41)],
  ])('should go forward from %o to %o, never beyond the current week', (semaine, suivante) => {
    const resultat = periode.suivante(semaine);

    expect(resultat).toEqual(suivante);
  });

  it('should cross a 53-week year', () => {
    const periodeDe2027 = new PeriodeConsultable(new JourCalendaire('2027-01-07'));

    expect(periodeDe2027.precedente(new SemaineISO(2027, 1))).toEqual(new SemaineISO(2026, 53));
  });

  it.each([
    [new MoisCalendaire(2026, 9), [37, 38, 39, 40]],
    [new MoisCalendaire(2026, 10), [41]],
    [new MoisCalendaire(2025, 10), [41, 42, 43, 44]],
    [new MoisCalendaire(2025, 9), []],
    [new MoisCalendaire(2026, 11), []],
  ])('should list from oldest to newest the consultable weeks starting in %o', (mois, numeros) => {
    const semaines = periode.semainesDu(mois);

    expect(semaines.map(semaine => semaine.numero)).toEqual(numeros);
  });

  it.each([
    [new MoisCalendaire(2025, 10), true],
    [new MoisCalendaire(2025, 9), false],
    [new MoisCalendaire(2026, 11), false],
  ])('should tell whether %o can be consulted', (mois, consultable) => {
    const resultat = periode.estConsultable(mois);

    expect(resultat).toBe(consultable);
  });
});
