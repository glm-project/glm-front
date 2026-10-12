import { JourCalendaire } from '../semaine/JourCalendaire';
import { MoisCivil } from './MoisCivil';

describe('MoisCivil', () => {
  it.each([
    [1999, 9, 'L’année d’un mois se situe entre 2000 et 2999.'],
    [3000, 9, 'L’année d’un mois se situe entre 2000 et 2999.'],
    [2026.5, 9, 'L’année d’un mois se situe entre 2000 et 2999.'],
    [2026, 0, 'Le mois 0 n’existe pas.'],
    [2026, 13, 'Le mois 13 n’existe pas.'],
    [2026, 1.5, 'Le mois 1.5 n’existe pas.'],
  ])('should refuse the month %s-%s', (annee, mois, message) => {
    expect(() => new MoisCivil(annee, mois)).toThrow(message);
  });

  it('should be the month that contains a day', () => {
    expect(MoisCivil.contenant(new JourCalendaire('2026-09-16'))).toEqual(new MoisCivil(2026, 9));
  });

  it.each([
    [2026, 9, '2026-09-01', '2026-09-30'],
    [2028, 2, '2028-02-01', '2028-02-29'],
    [2026, 12, '2026-12-01', '2026-12-31'],
    [2999, 12, '2999-12-01', '2999-12-31'],
  ])('should run %s-%s from its first to its last day', (annee, mois, premier, dernier) => {
    const civil = new MoisCivil(annee, mois);

    expect([civil.premierJour().value, civil.dernierJour().value]).toEqual([premier, dernier]);
  });

  it.each([
    [new MoisCivil(2026, 9), new MoisCivil(2026, 8)],
    [new MoisCivil(2026, 1), new MoisCivil(2025, 12)],
    [new MoisCivil(2000, 1), undefined],
  ])('should step back from %o to %o', (mois, precedent) => {
    expect(mois.precedent()).toEqual(precedent);
  });

  it.each([
    [new MoisCivil(2026, 9), new MoisCivil(2026, 10)],
    [new MoisCivil(2026, 12), new MoisCivil(2027, 1)],
    [new MoisCivil(2999, 12), undefined],
  ])('should step forward from %o to %o', (mois, suivant) => {
    expect(mois.suivant()).toEqual(suivant);
  });
});
