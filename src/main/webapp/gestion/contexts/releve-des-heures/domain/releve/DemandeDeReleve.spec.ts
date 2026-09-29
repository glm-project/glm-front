import { SemaineISO } from '../semaine/SemaineISO';
import { OperateurReleveId } from './OperateurReleveId';
import { DemandeDeReleve } from './SyntheseDesHeuresPort';

const demandeFixture = (operateur: string, annee: number, semaine: number): DemandeDeReleve =>
  new DemandeDeReleve(new OperateurReleveId(operateur), new SemaineISO(annee, semaine));

describe('DemandeDeReleve', () => {
  it('should be the same as a request of the same operator for the same week', () => {
    expect(demandeFixture('jean', 2026, 38).estLaMeme(demandeFixture('jean', 2026, 38))).toBe(true);
  });

  it('should not be the same as a request of the same operator for another week', () => {
    expect(demandeFixture('jean', 2026, 38).estLaMeme(demandeFixture('jean', 2026, 37))).toBe(false);
  });

  it('should not be the same as a request of another operator for the same week', () => {
    expect(demandeFixture('jean', 2026, 38).estLaMeme(demandeFixture('paul', 2026, 38))).toBe(false);
  });

  it('should not be the same as no request', () => {
    expect(demandeFixture('jean', 2026, 38).estLaMeme(undefined)).toBe(false);
  });
});
