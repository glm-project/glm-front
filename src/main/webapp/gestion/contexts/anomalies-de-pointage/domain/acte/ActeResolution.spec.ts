import { COMBINAISONS_VALIDES, combinaisonEstValide } from './ActeResolution';

describe('Valid combinations of a type and an intention', () => {
  it('should list the five combinations a pointage can have, from the start to the end', () => {
    expect(COMBINAISONS_VALIDES).toEqual([
      { type: 'DEBUT', intention: 'OUVERTURE' },
      { type: 'NON_CONFORMITE', intention: 'OUVERTURE' },
      { type: 'NON_CONFORMITE', intention: 'TRANSITION' },
      { type: 'DEBUT', intention: 'TRANSITION' },
      { type: 'FIN', intention: 'FIN' },
    ]);
  });

  it.each([
    { type: 'DEBUT', intention: 'OUVERTURE' },
    { type: 'NON_CONFORMITE', intention: 'TRANSITION' },
    { type: 'FIN', intention: 'FIN' },
  ] as const)('should accept the type "$type" with the intention "$intention"', ({ type, intention }) => {
    expect(combinaisonEstValide({ type, intention })).toBe(true);
  });

  it.each([
    { type: 'DEBUT', intention: 'FIN' },
    { type: 'FIN', intention: 'OUVERTURE' },
    { type: 'FIN', intention: 'TRANSITION' },
    { type: '', intention: 'OUVERTURE' },
    { type: 'DEBUT', intention: '' },
  ] as const)('should refuse the type "$type" with the intention "$intention"', ({ type, intention }) => {
    expect(combinaisonEstValide({ type, intention })).toBe(false);
  });
});
