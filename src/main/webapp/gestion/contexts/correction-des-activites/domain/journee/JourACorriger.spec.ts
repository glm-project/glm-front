import { JourACorriger } from './JourACorriger';

describe('JourACorriger', () => {
  it('should keep the calendar day it is given', () => {
    expect(new JourACorriger('2026-10-05').value).toBe('2026-10-05');
  });

  it.each(['2026-02-30', '2026-13-01', '05/10/2026', '2026-10-5', 'lundi'])('should refuse the day "%s"', jour => {
    expect(() => new JourACorriger(jour)).toThrow('Le jour reçu n’est pas un jour du calendrier.');
  });
});

describe('JourACorriger asked for by an address', () => {
  const AUJOURDHUI = new JourACorriger('2026-10-06');

  it.each(['2026-10-05', '2026-10-06'])('should accept the day "%s", which is not after today', jour => {
    expect(JourACorriger.demande(jour, AUJOURDHUI)?.value).toBe(jour);
  });

  it.each([
    { cas: 'after today', jour: '2026-10-07' },
    { cas: 'in a later year', jour: '2027-01-01' },
    { cas: 'absent', jour: null },
    { cas: 'malformed', jour: '05/10/2026' },
    { cas: 'not on the calendar', jour: '2026-02-30' },
  ])('should refuse a day $cas', ({ jour }) => {
    expect(JourACorriger.demande(jour, AUJOURDHUI)).toBeUndefined();
  });
});

describe('JourACorriger neighbours', () => {
  const AUJOURDHUI = new JourACorriger('2026-10-06');

  it.each([
    { jour: '2026-10-05', precedent: '2026-10-04' },
    { jour: '2026-10-01', precedent: '2026-09-30' },
    { jour: '2026-01-01', precedent: '2025-12-31' },
    { jour: '2024-03-01', precedent: '2024-02-29' },
  ])('should have $precedent before $jour', ({ jour, precedent }) => {
    expect(new JourACorriger(jour).precedent().value).toBe(precedent);
  });

  it('should have the next day while it is not after today', () => {
    expect(new JourACorriger('2026-10-05').suivant(AUJOURDHUI)?.value).toBe('2026-10-06');
  });

  it('should have no next day after today', () => {
    expect(AUJOURDHUI.suivant(AUJOURDHUI)).toBeUndefined();
  });

  it.each([
    { jour: '2026-10-05', autre: '2026-10-06', avant: true, apres: false },
    { jour: '2026-10-06', autre: '2026-10-06', avant: false, apres: false },
    { jour: '2026-10-07', autre: '2026-10-06', avant: false, apres: true },
  ])('should place $jour before or after $autre', ({ jour, autre, avant, apres }) => {
    const [courant, reference] = [new JourACorriger(jour), new JourACorriger(autre)];

    expect([courant.estAvant(reference), courant.estApres(reference)]).toEqual([avant, apres]);
  });
});
