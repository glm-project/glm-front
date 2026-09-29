import { InstantDeReleve } from '../releve/InstantDeReleve';
import { ElementReleveId } from './ElementReleveId';
import { FicheDIntervalle, IntervalleDActivite } from './IntervalleDActivite';

const instantFixture = (heure: string): InstantDeReleve => new InstantDeReleve(`2026-09-14T${heure}:00Z`);

const ficheFixture = (fiche: Partial<FicheDIntervalle>): FicheDIntervalle => ({
  element: new ElementReleveId('element-1'),
  poste: undefined,
  nature: undefined,
  categorie: 'TRAVAIL',
  debut: instantFixture('08:20'),
  fin: instantFixture('09:00'),
  presumee: false,
  ...fiche,
});

describe('IntervalleDActivite', () => {
  it('should refuse a presumed interval without an end', () => {
    expect(() => new IntervalleDActivite(ficheFixture({ fin: undefined, presumee: true }))).toThrow(
      'L’intervalle reçu du serveur est présumé sans fin.',
    );
  });

  it('should refuse an interval ending before it starts', () => {
    expect(() => new IntervalleDActivite(ficheFixture({ debut: instantFixture('08:20'), fin: instantFixture('08:19') }))).toThrow(
      'L’intervalle reçu du serveur finit avant de commencer.',
    );
  });

  it('should accept an interval still in progress, without an end', () => {
    expect(() => new IntervalleDActivite(ficheFixture({ fin: undefined }))).not.toThrow();
  });

  it('should accept an interval of zero duration', () => {
    expect(() => new IntervalleDActivite(ficheFixture({ debut: instantFixture('08:20'), fin: instantFixture('08:20') }))).not.toThrow();
  });

  describe('overlap', () => {
    type Bornes = readonly [string, string | undefined];

    const intervalleDe = ([debut, fin]: Bornes): IntervalleDActivite =>
      new IntervalleDActivite(ficheFixture({ debut: instantFixture(debut), fin: fin === undefined ? undefined : instantFixture(fin) }));

    it.each([
      ['starts before the other one ends and ends after it starts', ['08:00', '12:00'], ['10:00', '14:00']],
      ['contains the other one', ['08:00', '16:00'], ['10:00', '12:00']],
      ['is still in progress and started before the other one ended', ['10:00', undefined], ['08:00', '12:00']],
      ['ends after the start of an interval still in progress', ['08:00', '12:00'], ['10:00', undefined]],
      ['is still in progress like the other one', ['08:00', undefined], ['10:00', undefined]],
    ] as const)('should overlap an interval that %s', (_cas, une, autre) => {
      expect(intervalleDe(une).chevauche(intervalleDe(autre))).toBe(true);
    });

    it.each([
      ['ends when the other one starts', ['08:00', '12:00'], ['12:00', '14:00']],
      ['starts when the other one ends', ['12:00', '14:00'], ['08:00', '12:00']],
      ['ends before the other one starts', ['08:00', '10:00'], ['12:00', '14:00']],
      ['is still in progress and started after the other one ended', ['13:00', undefined], ['08:00', '12:00']],
      ['ends before the start of an interval still in progress', ['08:00', '12:00'], ['13:00', undefined]],
    ] as const)('should not overlap an interval that %s', (_cas, une, autre) => {
      expect(intervalleDe(une).chevauche(intervalleDe(autre))).toBe(false);
    });
  });
});
