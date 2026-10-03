import {
  elementFixture,
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

describe('FriseDeLaSemaine', () => {
  describe('lines across the open day', () => {
    const releveDeTraits = (): ReleveDesHeures =>
      releveFixture(SEMAINE_EN_COURS, {
        0: {
          pointagesDElement: [
            { type: 'DEBUT', heure: [8, 0] },
            { type: 'FIN', heure: [16, 0] },
          ],
        },
        1: { pointagesDElement: [{ type: 'DEBUT', heure: [9, 0] }] },
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

      expect([arrondi(repere?.gauche), repere?.titre]).toEqual([66.67, 'Fin 16:00']);
    });

    it('should draw no guide while no clocking is chosen', () => {
      expect(frise(releveDeTraits(), LUNDI).calque?.repere).toBeUndefined();
    });

    it.each([
      ['an isolated clocking of an element', { pointagesDElement: [{ type: 'FIN', heure: [5, 30] }] }],
      ['an isolated finish late in the day', { pointagesDElement: [{ type: 'FIN', heure: [22, 45] }] }],
    ] as const)('should open the axis of the open day onto the whole day for %s outside the daytime hours', (_cas, jour) => {
      const releve = releveFixture(SEMAINE_EN_COURS, { 0: jour }, {}, [elementFixture()]);
      const reperes = frise(releve, LUNDI).jours[0]?.reperes ?? [];

      expect([reperes[0]?.libelle, reperes.at(-1)?.libelle]).toEqual(['0 h', '24 h']);
    });
  });

  describe('columns', () => {
    const colonnes = (releve: ReleveDesHeures, ouvert?: JourCalendaire): string[] => frise(releve, ouvert).colonnes.split(' ');

    it('should keep comparable widths for all days regardless of their activity', () => {
      const releve = releveFixture(SEMAINE_EN_COURS, { 0: jourTravailleFixture, 1: jourTravailleFixture });

      expect(colonnes(releve, LUNDI)).toEqual([
        'var(--largeur-etiquette)',
        'var(--largeur-jour)',
        'var(--largeur-jour)',
        'var(--largeur-jour)',
        'var(--largeur-jour)',
        'var(--largeur-jour)',
        'var(--largeur-jour)',
        'var(--largeur-jour)',
        'var(--largeur-total)',
      ]);
    });

    it('should keep an empty consulted day at the common width', () => {
      const releve = releveFixture(SEMAINE_EN_COURS, { 0: jourTravailleFixture });

      expect(colonnes(releve, new JourCalendaire('2026-09-20'))[7]).toBe('var(--largeur-jour)');
    });
  });
});
