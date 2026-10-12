import { bornesDeCloture, estUnJour, periodeLibre } from './PeriodeDeCloture';

const AUJOURDHUI = new Date(2026, 9, 12, 10, 30);
const FIN_D_AUJOURDHUI = new Date(2026, 9, 12, 23, 59, 59, 999);

describe('PeriodeDeCloture', () => {
  it.each([
    ['CE_MOIS', new Date(2026, 9, 1)],
    ['TROIS_MOIS', new Date(2026, 6, 12)],
    ['DOUZE_MOIS', new Date(2025, 9, 12)],
  ] as const)('should bound the %s preset up to the end of today', (prereglage, debut) => {
    expect(bornesDeCloture({ prereglage }, AUJOURDHUI)).toEqual({ debut, fin: FIN_D_AUJOURDHUI });
  });

  it('should bound free days from the start of the first to the end of the last', () => {
    expect(bornesDeCloture({ du: '2026-03-01', au: '2026-03-31' }, AUJOURDHUI)).toEqual({
      debut: new Date(2026, 2, 1),
      fin: new Date(2026, 2, 31, 23, 59, 59, 999),
    });
  });

  it('should put free days back in order', () => {
    expect(bornesDeCloture({ du: '2026-03-31', au: '2026-03-01' }, AUJOURDHUI)).toEqual({
      debut: new Date(2026, 2, 1),
      fin: new Date(2026, 2, 31, 23, 59, 59, 999),
    });
  });

  it.each([
    ['2026-03-01', '2026-03-31', { du: '2026-03-01', au: '2026-03-31' }],
    ['2026-03-01', '', undefined],
    ['', '2026-03-31', undefined],
  ])('should make a free period of %j and %j only from two calendar days', (du, au, attendue) => {
    expect(periodeLibre(du, au)).toEqual(attendue);
  });

  it.each([
    ['2026-03-01', true],
    ['2026-02-30', false],
    ['2026-3-1', false],
    ['mars', false],
  ])('should tell whether %s is a calendar day', (jour, attendu) => {
    expect(estUnJour(jour)).toBe(attendu);
  });
});
