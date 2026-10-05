import { PeriodeConsultable } from './PeriodeConsultable';
import { JourCalendaire } from './semaine/JourCalendaire';
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
});
