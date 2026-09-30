import { ActiviteReleveId } from '../releve/ActiviteReleveId';
import { InstantDeReleve } from '../releve/InstantDeReleve';
import { ActiviteDuReleve } from './ActiviteDuReleve';
import { ElementReleveId } from './ElementReleveId';
import { FicheDIntervalle, IntervalleDActivite } from './IntervalleDActivite';
import { PosteReleveId } from './PosteReleveId';

const activiteFixture = (debut: InstantDeReleve, fin: InstantDeReleve | undefined): ActiviteDuReleve =>
  fin === undefined
    ? { id: new ActiviteReleveId('a'), debut, etat: 'EN_COURS' }
    : { id: new ActiviteReleveId('a'), debut, fin, etat: 'TERMINEE' };

const instantFixture = (heure: string): InstantDeReleve => new InstantDeReleve(`2026-09-14T${heure}:00Z`);

const ficheFixture = (fiche: Partial<FicheDIntervalle>): FicheDIntervalle => ({
  element: new ElementReleveId('element-1'),
  poste: undefined,
  nature: undefined,
  categorie: 'TRAVAIL',
  debut: instantFixture('08:20'),
  fin: instantFixture('09:00'),
  ...fiche,
  activite:
    fiche.activite
    ?? activiteFixture(fiche.debut ?? instantFixture('08:20'), Object.hasOwn(fiche, 'fin') ? fiche.fin : instantFixture('09:00')),
});

describe('IntervalleDActivite', () => {
  it('should keep an unresolved activity distinct from one still in progress', () => {
    const intervalle = new IntervalleDActivite(
      ficheFixture({
        fin: undefined,
        activite: {
          id: new ActiviteReleveId('ouverture-a'),
          debut: instantFixture('08:20'),
          etat: 'A_RESOUDRE',
          finAuPlusTard: instantFixture('17:00'),
        },
      }),
    );

    expect(intervalle.estEnCours()).toBe(false);
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

  it('should be in progress without an end', () => {
    expect(new IntervalleDActivite(ficheFixture({ fin: undefined })).estEnCours()).toBe(true);
  });

  it('should not be in progress with an end', () => {
    expect(new IntervalleDActivite(ficheFixture({ fin: instantFixture('09:00') })).estEnCours()).toBe(false);
  });

  it('should stop at its end', () => {
    const intervalle = new IntervalleDActivite(ficheFixture({ debut: instantFixture('08:20'), fin: instantFixture('09:00') }));

    expect(intervalle.finOuDebut().value.toISOString()).toBe('2026-09-14T09:00:00.000Z');
  });

  it('should stop where it began while in progress', () => {
    const intervalle = new IntervalleDActivite(ficheFixture({ debut: instantFixture('08:20'), fin: undefined }));

    expect(intervalle.finOuDebut().value.toISOString()).toBe('2026-09-14T08:20:00.000Z');
  });

  it('should name its element and its workstation as its target', () => {
    const intervalle = new IntervalleDActivite(ficheFixture({ element: new ElementReleveId('carter'), poste: new PosteReleveId('dmu') }));

    expect([intervalle.cible().element.value, intervalle.cible().poste?.value]).toEqual(['carter', 'dmu']);
  });

  it('should name no workstation as its target when it has none', () => {
    const intervalle = new IntervalleDActivite(ficheFixture({ poste: undefined }));

    expect(intervalle.cible().poste).toBeUndefined();
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
