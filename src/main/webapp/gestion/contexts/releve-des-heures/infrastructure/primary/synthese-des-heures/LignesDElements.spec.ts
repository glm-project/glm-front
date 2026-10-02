import { elementFixture, releveFixture, SEMAINE_EN_COURS } from '@test/unit/fixtures/gestion/releve-des-heures/ReleveDesHeuresFixture';
import { ReleveDesHeures } from '../../../domain/releve/ReleveDesHeures';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { JourSurSonAxe, jourSurSonAxe } from './JourSurSonAxe';
import { CelluleDeLigne, LigneDeFrise, ligneDeFrise } from './LignesDElements';

const POSTES = [
  ['DMU 50', 'Fraisage'],
  ['Mazak QT-200', 'Tournage'],
] as const;

const arrondi = (valeur: number | undefined): number | undefined => (valeur === undefined ? undefined : Math.round(valeur * 100) / 100);

const LUNDI = '2026-09-14';

const ligneDe = (releve: ReleveDesHeures, options: { ouvert?: string; choix?: number; enParallele?: boolean } = {}): LigneDeFrise => {
  const [element] = releve.elements;
  if (element === undefined) {
    throw new Error('Le relevé de la spec porte au moins un élément.');
  }
  const ouvert = options.ouvert === undefined ? undefined : new JourCalendaire(options.ouvert);
  const jours: JourSurSonAxe[] = releve.jours.map(jour => jourSurSonAxe(jour, ouvert, options.choix));
  return ligneDeFrise(element, jours, options.enParallele ?? releve.travailleEnParallele(element));
};

const barres = (cellule: CelluleDeLigne | undefined): (readonly [string, number | undefined, number | undefined])[] =>
  (cellule?.barres ?? []).map(barre => [barre.style, arrondi(barre.gauche), arrondi(barre.largeur)] as const);

const marques = (cellule: CelluleDeLigne | undefined): (readonly [string, number | undefined, string])[] =>
  (cellule?.marques ?? []).map(marque => [marque.type, arrondi(marque.gauche), marque.titre] as const);

const barresDesCellules = (ligne: LigneDeFrise): number[] => ligne.cellules.map(cellule => cellule.barres.length);

describe('LignesDElements', () => {
  describe('bars', () => {
    it('should place the work of an element in the cell of its day, on the axis of that day', () => {
      const releve = releveFixture(SEMAINE_EN_COURS, { 0: { intervalles: [{ debut: [8, 0], fin: [12, 0] }] } }, {}, [elementFixture()]);

      expect(barresDesCellules(ligneDe(releve))).toEqual([1, 0, 0, 0, 0, 0, 0]);
    });

    it('should scale the work of an element as a share of the daytime hours', () => {
      const releve = releveFixture(SEMAINE_EN_COURS, { 0: { intervalles: [{ debut: [8, 0], fin: [12, 0] }] } }, {}, [elementFixture()]);

      expect(barres(ligneDe(releve).cellules[0])).toEqual([['travail', 12.5, 25]]);
    });

    it('should draw a non-conformity apart from the work it follows, at its own place', () => {
      const releve = releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { debut: [8, 0], fin: [12, 0] },
              { categorie: 'NON_CONFORMITE', debut: [12, 0], fin: [14, 0] },
            ],
          },
        },
        {},
        [elementFixture()],
      );

      expect(barres(ligneDe(releve).cellules[0])).toEqual([
        ['travail', 12.5, 25],
        ['nc', 37.5, 12.5],
      ]);
    });

    it.each([
      ['starts before the daytime hours', [5, 30], [7, 0], [22.92, 6.25]],
      ['goes on past midnight', [21, 0], [24, 0], [87.5, 12.5]],
    ] as const)('should scale the work of an element that %s as a share of the whole day', (_cas, debut, fin, [gauche, largeur]) => {
      const releve = releveFixture(SEMAINE_EN_COURS, { 0: { intervalles: [{ debut, fin }] } }, {}, [elementFixture()]);

      expect(barres(ligneDe(releve).cellules[0])).toEqual([['travail', gauche, largeur]]);
    });

    it('should mark the work still in progress at the place where it began, without any extent', () => {
      const releve = releveFixture(SEMAINE_EN_COURS, { 0: { intervalles: [{ debut: [10, 20] }] } }, {}, [elementFixture()]);

      expect(barres(ligneDe(releve).cellules[0])).toEqual([['en-cours', 27.08, undefined]]);
    });

    it('should keep in one row an element worked from two workstations one after the other', () => {
      const releve = releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
              { poste: 'poste-1', debut: [12, 0], fin: [14, 0] },
            ],
          },
        },
        {},
        [elementFixture({ postes: POSTES })],
      );

      expect([ligneDe(releve).sousLignes.length, barres(ligneDe(releve).cellules[0])]).toEqual([
        0,
        [
          ['travail', 12.5, 25],
          ['travail', 37.5, 12.5],
        ],
      ]);
    });
  });

  describe('sub-rows by workstation', () => {
    const releveEnParallele = (): ReleveDesHeures =>
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
              { poste: 'poste-1', debut: [10, 0], fin: [14, 0] },
            ],
          },
          1: { intervalles: [{ poste: 'poste-1', debut: [8, 0], fin: [9, 0] }] },
        },
        {},
        [elementFixture({ duree: 'PT8H', postes: POSTES })],
      );

    it('should leave nothing on the row of an element split by workstation', () => {
      expect(barresDesCellules(ligneDe(releveEnParallele()))).toEqual([0, 0, 0, 0, 0, 0, 0]);
    });

    it('should draw on the sub-row of each workstation the work done from it, on the axis of its day', () => {
      const ligne = ligneDe(releveEnParallele());

      expect(ligne.sousLignes.map(sousLigne => [sousLigne.poste, barres(sousLigne.cellules[0])])).toEqual([
        ['DMU 50', [['travail', 12.5, 25]]],
        ['Mazak QT-200', [['travail', 25, 25]]],
      ]);
    });

    it('should carry the split of the whole week to the days after the overlap', () => {
      expect(ligneDe(releveEnParallele()).sousLignes.map(sousLigne => sousLigne.cellules.map(cellule => cellule.barres.length))).toEqual([
        [1, 0, 0, 0, 0, 0, 0],
        [1, 1, 0, 0, 0, 0, 0],
      ]);
    });

    it('should keep the total of the element on its own row, none on the sub-rows', () => {
      expect(ligneDe(releveEnParallele()).total).toBe('8 h 00');
    });
  });

  describe('markers', () => {
    const releveDeMarques = (): ReleveDesHeures =>
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [{ debut: [8, 0], fin: [14, 0] }],
            pointagesDElement: [
              { type: 'DEBUT', heure: [8, 0] },
              { type: 'NON_CONFORMITE', heure: [12, 0] },
              { type: 'FIN', heure: [14, 0] },
            ],
          },
          1: { pointagesDElement: [{ type: 'DEBUT', heure: [9, 0] }] },
        },
        {},
        [elementFixture()],
      );

    it('should place the clockings of an element in the open day at their instant, as a share of its axis', () => {
      expect(marques(ligneDe(releveDeMarques(), { ouvert: LUNDI }).cellules[0])).toEqual([
        ['debut', 12.5, 'Début 08:00'],
        ['nc', 37.5, 'Non-conformité 12:00'],
        ['fin', 50, 'Fin 14:00'],
      ]);
    });

    it('should place no marker in a day that is not open', () => {
      expect(ligneDe(releveDeMarques(), { ouvert: LUNDI }).cellules.map(cellule => cellule.marques.length)).toEqual([3, 0, 0, 0, 0, 0, 0]);
    });

    it('should place no marker anywhere while no day is open', () => {
      expect(ligneDe(releveDeMarques()).cellules.map(cellule => cellule.marques.length)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    });

    it('should keep a marker for a clocking that no bar surrounds', () => {
      const releve = releveFixture(SEMAINE_EN_COURS, { 0: { pointagesDElement: [{ type: 'FIN', heure: [17, 45] }] } }, {}, [
        elementFixture(),
      ]);

      expect([barresDesCellules(ligneDe(releve, { ouvert: LUNDI }))[0], marques(ligneDe(releve, { ouvert: LUNDI }).cellules[0])]).toEqual([
        0,
        [['fin', 73.44, 'Fin 17:45']],
      ]);
    });

    it('should ring the marker of the chosen clocking, and no other', () => {
      const ligne = ligneDe(releveDeMarques(), { ouvert: LUNDI, choix: 2 });

      expect(ligne.cellules[0]?.marques.map(marque => marque.choisie)).toEqual([false, false, true]);
    });

    it('should ring no marker while no clocking is chosen', () => {
      const ligne = ligneDe(releveDeMarques(), { ouvert: LUNDI });

      expect(ligne.cellules[0]?.marques.map(marque => marque.choisie)).toEqual([false, false, false]);
    });
  });
});
