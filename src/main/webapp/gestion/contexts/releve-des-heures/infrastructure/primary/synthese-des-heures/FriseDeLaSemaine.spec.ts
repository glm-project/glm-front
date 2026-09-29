import {
  elementFixture,
  jourAbandonneFixture,
  jourTravailleFixture,
  releveFixture,
  SEMAINE_EN_COURS,
} from '@test/unit/fixtures/gestion/releve-des-heures/ReleveDesHeuresFixture';
import { ReleveDesHeures } from '../../../domain/releve/ReleveDesHeures';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { FriseDeLaSemaine, friseDeLaSemaine } from './FriseDeLaSemaine';

const AUJOURDHUI = new JourCalendaire('2026-09-17');
const LUNDI = new JourCalendaire('2026-09-14');

const arrondi = (valeur: number | undefined): number | undefined => (valeur === undefined ? undefined : Math.round(valeur * 100) / 100);

const frise = (releve: ReleveDesHeures, ouvert?: JourCalendaire, selection?: number): FriseDeLaSemaine =>
  friseDeLaSemaine(releve, AUJOURDHUI, ouvert, selection);

const presences = (releve: ReleveDesHeures, rang = 0): (readonly [string, number | undefined, number | undefined])[] =>
  (frise(releve).jours[rang]?.presence ?? []).map(barre => [barre.style, arrondi(barre.gauche), arrondi(barre.largeur)] as const);

describe('FriseDeLaSemaine', () => {
  describe('presence bars', () => {
    it('should place a presence on the axis of its day, from its arrival to its departure', () => {
      const releve = releveFixture(SEMAINE_EN_COURS, {
        0: {
          plages: [
            [
              [8, 0],
              [12, 0],
            ],
          ],
        },
      });

      expect(presences(releve)).toEqual([['plage', 12.5, 25]]);
    });

    it('should place each visit of a day apart', () => {
      const releve = releveFixture(SEMAINE_EN_COURS, { 0: jourTravailleFixture });

      expect(presences(releve)).toEqual([
        ['plage', 12.71, 24.79],
        ['plage', 43.75, 28.33],
      ]);
    });

    it('should open the axis of a day onto the whole day when a presence touches midnight, and carry it over the next day', () => {
      const releve = releveFixture(SEMAINE_EN_COURS, {
        0: {
          plages: [
            [
              [19, 0],
              [24, 0],
            ],
          ],
        },
        1: {
          plages: [
            [
              [0, 0],
              [7, 0],
            ],
          ],
        },
      });

      expect([presences(releve, 0), presences(releve, 1)]).toEqual([[['plage', 79.17, 20.83]], [['plage', 0, 29.17]]]);
    });

    it.each([
      ['starts before the daytime hours', [5, 30], [13, 0], [22.92, 31.25]],
      ['ends after the daytime hours', [14, 0], [22, 30], [58.33, 35.42]],
      ['runs exactly over the daytime hours', [6, 0], [22, 0], [0, 100]],
    ] as const)('should scale a day on %s according to the hours it draws', (_cas, debut, fin, [gauche, largeur]) => {
      const releve = releveFixture(SEMAINE_EN_COURS, { 0: { plages: [[debut, fin]] } });

      expect(presences(releve)).toEqual([['plage', gauche, largeur]]);
    });

    it('should mark a presence still in progress at the place where it began, rather than invent its end', () => {
      const releve = releveFixture(SEMAINE_EN_COURS, { 3: { plages: [[[10, 20], undefined]] } });

      expect(presences(releve, 3)).toEqual([['ouverte', 27.08, undefined]]);
    });

    it('should tell a presumed presence from a clocked one', () => {
      const releve = releveFixture(SEMAINE_EN_COURS, { 1: jourAbandonneFixture });

      expect(presences(releve, 1)).toEqual([['presumee', 27.08, 33.33]]);
    });
  });

  describe('lines across the open day', () => {
    const releveDeTraits = (): ReleveDesHeures =>
      releveFixture(SEMAINE_EN_COURS, {
        0: {
          pointages: [
            ['ARRIVEE', [8, 0]],
            ['DEPART', [16, 0]],
          ],
        },
        1: { pointages: [['ARRIVEE', [9, 0]]] },
      });

    it('should draw a line at each arrival and each departure of the open day', () => {
      expect(frise(releveDeTraits(), LUNDI).calque?.traits.map(trait => [arrondi(trait.gauche), trait.titre])).toEqual([
        [12.5, 'Arrivée 08:00'],
        [62.5, 'Départ 16:00'],
      ]);
    });

    it('should carry the lines over the column of the open day', () => {
      expect(frise(releveDeTraits(), LUNDI).calque?.colonne).toBe(2);
    });

    it('should carry the lines over the column of another open day', () => {
      expect(frise(releveDeTraits(), new JourCalendaire('2026-09-15')).calque?.colonne).toBe(3);
    });

    it('should draw no line while no day is open', () => {
      expect(frise(releveDeTraits()).calque).toBeUndefined();
    });

    it('should situate a chosen clocking by a guide at its instant', () => {
      const repere = frise(releveDeTraits(), LUNDI, 1).calque?.repere;

      expect([arrondi(repere?.gauche), repere?.titre]).toEqual([62.5, 'Départ 16:00']);
    });

    it('should draw no guide while no clocking is chosen', () => {
      expect(frise(releveDeTraits(), LUNDI).calque?.repere).toBeUndefined();
    });

    it.each([
      ['an isolated clocking of an element', { pointagesDElement: [{ type: 'FIN', heure: [5, 30] }] }, undefined],
      ['a departure no interval or presence surrounds', { pointages: [['DEPART', [22, 45]]] }, 94.79],
    ] as const)('should open the axis of the open day onto the whole day for %s outside the daytime hours', (_cas, jour, gauche) => {
      const releve = releveFixture(SEMAINE_EN_COURS, { 0: jour }, {}, [elementFixture()]);
      const reperes = frise(releve, LUNDI).jours[0]?.reperes ?? [];

      expect([reperes[0]?.libelle, reperes.at(-1)?.libelle, arrondi(frise(releve, LUNDI).calque?.traits[0]?.gauche)]).toEqual([
        '0 h',
        '24 h',
        gauche,
      ]);
    });
  });

  describe('columns', () => {
    const colonnes = (releve: ReleveDesHeures, ouvert?: JourCalendaire): string[] => frise(releve, ouvert).colonnes.split(' ');

    it('should give the open day the widest column, an empty day the narrowest, the others the middle one', () => {
      const releve = releveFixture(SEMAINE_EN_COURS, { 0: jourTravailleFixture, 1: jourTravailleFixture });

      expect(colonnes(releve, LUNDI)).toEqual([
        'var(--largeur-etiquette)',
        'var(--largeur-ouverte)',
        'var(--largeur-fermee)',
        'var(--largeur-vide)',
        'var(--largeur-vide)',
        'var(--largeur-vide)',
        'var(--largeur-vide)',
        'var(--largeur-vide)',
        'var(--largeur-total)',
      ]);
    });

    it('should give an empty open day the width of an open day', () => {
      const releve = releveFixture(SEMAINE_EN_COURS, { 0: jourTravailleFixture });

      expect(colonnes(releve, new JourCalendaire('2026-09-20'))[7]).toBe('var(--largeur-ouverte)');
    });
  });
});
