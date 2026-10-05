import { JourCalendaire } from './JourCalendaire';
import { SemaineISO } from './SemaineISO';

describe('SemaineISO', () => {
  it.each([
    ['2026-10-08', 2026, 41],
    ['2026-01-01', 2026, 1],
    ['2027-01-01', 2026, 53],
    ['2024-12-30', 2025, 1],
    ['2026-10-11', 2026, 41],
  ])('should place %s in ISO year %i, week %i', (jour, annee, numero) => {
    const semaine = SemaineISO.contenant(new JourCalendaire(jour));

    expect(semaine).toEqual(new SemaineISO(annee, numero));
  });

  it('should list the seven days from Monday to Sunday', () => {
    const jours = new SemaineISO(2026, 53).jours();

    expect(jours.map(jour => jour.value)).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ]);
  });

  it.each([
    [1999, 1, 'L’année d’une semaine se situe entre 2000 et 2999.'],
    [3000, 1, 'L’année d’une semaine se situe entre 2000 et 2999.'],
    [2026.5, 1, 'L’année d’une semaine se situe entre 2000 et 2999.'],
    [2025, 53, 'L’année 2025 ne porte pas de semaine 53.'],
    [2026, 0, 'L’année 2026 ne porte pas de semaine 0.'],
    [2026, 1.5, 'L’année 2026 ne porte pas de semaine 1.5.'],
  ])('should refuse year %s week %s', (annee, numero, message) => {
    const construction = (): SemaineISO => new SemaineISO(annee, numero);

    expect(construction).toThrow(message);
  });

  it.each([
    [new SemaineISO(2026, 41), true],
    [new SemaineISO(2026, 40), false],
    [new SemaineISO(2025, 41), false],
  ])('should compare weeks by year and number', (autre, attendu) => {
    const memeSemaine = new SemaineISO(2026, 41).estLaMeme(autre);

    expect(memeSemaine).toBe(attendu);
  });
});
