import { JourCalendaire } from './JourCalendaire';
import { SemaineISO } from './SemaineISO';

describe('SemaineISO', () => {
  it.each([1999, 3000, 2026.5])('should refuse year %s, outside the calendar this front serves', annee => {
    expect(() => new SemaineISO(annee, 1)).toThrow('L’année d’une semaine se situe entre 2000 et 2999.');
  });

  it.each([
    [2025, 53],
    [2026, 54],
    [2027, 53],
    [2026, 0],
    [2026, 38.5],
  ])('should refuse week %i of %i, which that year does not carry', (annee, numero) => {
    expect(() => new SemaineISO(annee, numero)).toThrow(`L’année ${annee} ne porte pas de semaine ${numero}.`);
  });

  it.each([
    [2000, 52],
    [2004, 53],
    [2009, 53],
    [2015, 53],
    [2020, 53],
    [2024, 52],
    [2025, 52],
    [2026, 53],
    [2027, 52],
    [2999, 52],
  ])('should count %i as carrying %i ISO weeks', (annee, attendu) => {
    expect(SemaineISO.nombreDeSemaines(annee)).toBe(attendu);
  });

  it('should open week 1 on the Monday that belongs to the previous year', () => {
    const semaine = new SemaineISO(2026, 1);

    expect(semaine.lundi().value).toBe('2025-12-29');
  });

  it('should bound a mid-year week from Monday to Sunday', () => {
    const semaine = new SemaineISO(2026, 38);

    expect([semaine.lundi().value, semaine.dimanche().value]).toEqual(['2026-09-14', '2026-09-20']);
  });

  it('should lay out the seven days of a week in calendar order', () => {
    const semaine = new SemaineISO(2026, 1);

    expect(semaine.jours().map(jour => jour.value)).toEqual([
      '2025-12-29',
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
    ]);
  });

  it('should step back into the previous year from week 1', () => {
    const semaine = new SemaineISO(2026, 1);

    expect(semaine.precedente()).toMatchObject({ annee: 2025, numero: 52 });
  });

  it('should step back within the same year', () => {
    const semaine = new SemaineISO(2026, 38);

    expect(semaine.precedente()).toMatchObject({ annee: 2026, numero: 37 });
  });

  it('should offer no earlier week at the first week the calendar serves', () => {
    const semaine = new SemaineISO(2000, 1);

    expect(semaine.precedente()).toBeUndefined();
  });

  it('should step forward into the next year from the last week', () => {
    const semaine = new SemaineISO(2026, 53);

    expect(semaine.suivante()).toMatchObject({ annee: 2027, numero: 1 });
  });

  it('should step forward within the same year', () => {
    const semaine = new SemaineISO(2026, 38);

    expect(semaine.suivante()).toMatchObject({ annee: 2026, numero: 39 });
  });

  it('should offer no later week at the last week the calendar serves', () => {
    const semaine = new SemaineISO(2999, 52);

    expect(semaine.suivante()).toBeUndefined();
  });

  it.each([
    ['2026-09-14', 2026, 38],
    ['2026-09-17', 2026, 38],
    ['2026-09-20', 2026, 38],
    ['2025-12-29', 2026, 1],
    ['2026-01-01', 2026, 1],
    ['2027-01-01', 2026, 53],
    ['2025-01-01', 2025, 1],
    ['2024-12-31', 2025, 1],
  ])('should name %s as week %i of %i', (jour, annee, numero) => {
    const semaine = SemaineISO.contenant(new JourCalendaire(jour));

    expect(semaine).toMatchObject({ annee, numero });
  });

  it.each([
    [2026, 39, 2026, 38, true],
    [2026, 38, 2026, 38, false],
    [2026, 37, 2026, 38, false],
    [2027, 1, 2026, 53, true],
    [2025, 52, 2026, 1, false],
  ])('should tell whether week %i of %i comes after week %i of %i', (annee, numero, autreAnnee, autreNumero, attendu) => {
    const semaine = new SemaineISO(annee, numero);

    expect(semaine.estApres(new SemaineISO(autreAnnee, autreNumero))).toBe(attendu);
  });

  it.each([
    [2026, 38, 2026, 38, true],
    [2026, 38, 2026, 37, false],
    [2026, 38, 2025, 38, false],
  ])('should tell whether week %i of %i is week %i of %i', (annee, numero, autreAnnee, autreNumero, attendu) => {
    const semaine = new SemaineISO(annee, numero);

    expect(semaine.estLaMeme(new SemaineISO(autreAnnee, autreNumero))).toBe(attendu);
  });
});
