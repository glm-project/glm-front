import { DureeTravaillee } from '../../../domain/duree/DureeTravaillee';
import { InstantDeReleve } from '../../../domain/releve/InstantDeReleve';
import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { PointageDeReleve } from '../../../domain/releve/PointageDeReleve';
import { TypeDePointage } from '../../../domain/releve/TypeDePointage';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { FriseDeLaSemaine } from './FriseDeLaSemaine';

const JOURNEE_DE_TRAVAIL = [6 * 60, 22 * 60];
const JOURNEE_ENTIERE = [0, 24 * 60];

const pointageFixture = (type: TypeDePointage, heure: number, minute = 0): PointageDeReleve =>
  new PointageDeReleve(type, new InstantDeReleve(new Date(2026, 8, 14, heure, minute).toISOString()));

const jourFixture = (pointages: readonly PointageDeReleve[]): JourDeReleve =>
  new JourDeReleve(new JourCalendaire('2026-09-14'), new DureeTravaillee('PT7H30M'), pointages);

const journeeOrdinaireFixture = (): JourDeReleve =>
  jourFixture([
    pointageFixture('ARRIVEE', 8, 2),
    pointageFixture('PAUSE', 12),
    pointageFixture('REPRISE', 13),
    pointageFixture('DEPART', 17, 32),
  ]);

const arrondi = (valeur: number): number => Math.round(valeur * 10) / 10;

const piecesDe = (frise: FriseDeLaSemaine, jour: JourDeReleve): { gauche: number; largeur: number }[] =>
  jour
    .plages()
    .flatMap(plage => frise.dessine(plage).pieces)
    .map(piece => ({ gauche: arrondi(piece.gauche), largeur: arrondi(piece.largeur) }));

describe('FriseDeLaSemaine', () => {
  it('should hold an ordinary week on the working day', () => {
    const frise = new FriseDeLaSemaine([journeeOrdinaireFixture()]);

    expect([frise.debut, frise.fin]).toEqual(JOURNEE_DE_TRAVAIL);
  });

  it('should hold a week carrying no clocking on the working day', () => {
    const frise = new FriseDeLaSemaine([jourFixture([])]);

    expect([frise.debut, frise.fin]).toEqual(JOURNEE_DE_TRAVAIL);
  });

  it('should open onto the whole day for a clocking before the working day', () => {
    const frise = new FriseDeLaSemaine([jourFixture([pointageFixture('ARRIVEE', 5, 30), pointageFixture('DEPART', 13)])]);

    expect([frise.debut, frise.fin]).toEqual(JOURNEE_ENTIERE);
  });

  it('should open onto the whole day for a clocking after the working day', () => {
    const frise = new FriseDeLaSemaine([jourFixture([pointageFixture('ARRIVEE', 14), pointageFixture('DEPART', 23)])]);

    expect([frise.debut, frise.fin]).toEqual(JOURNEE_ENTIERE);
  });

  it('should open onto the whole day as soon as a shift crosses midnight', () => {
    const frise = new FriseDeLaSemaine([jourFixture([pointageFixture('ARRIVEE', 22), pointageFixture('DEPART', 2)])]);

    expect([frise.debut, frise.fin]).toEqual(JOURNEE_ENTIERE);
  });

  it('should open onto the whole day for the one day of the week that leaves it', () => {
    const frise = new FriseDeLaSemaine([
      journeeOrdinaireFixture(),
      jourFixture([pointageFixture('ARRIVEE', 20), pointageFixture('DEPART', 23, 30)]),
    ]);

    expect([frise.debut, frise.fin]).toEqual(JOURNEE_ENTIERE);
  });

  it.each([0, 1, 5, 6, 12, 17, 20, 22, 23])('should keep its span inside the day for a week starting at %i o clock', heureDArrivee => {
    const jour = jourFixture([pointageFixture('ARRIVEE', heureDArrivee), pointageFixture('DEPART', heureDArrivee, 30)]);
    const frise = new FriseDeLaSemaine([jour]);

    expect([frise.debut >= 0, frise.fin <= 24 * 60, frise.fin > frise.debut]).toEqual([true, true, true]);
  });

  it('should draw a shift crossing midnight as the two pieces it is', () => {
    const jour = jourFixture([pointageFixture('ARRIVEE', 22), pointageFixture('DEPART', 2)]);
    const frise = new FriseDeLaSemaine([jour]);

    expect(piecesDe(frise, jour)).toEqual([
      { gauche: arrondi((22 / 24) * 100), largeur: arrondi((2 / 24) * 100) },
      { gauche: 0, largeur: arrondi((2 / 24) * 100) },
    ]);
  });

  it('should place a presence and the break that cuts it', () => {
    const jour = journeeOrdinaireFixture();
    const frise = new FriseDeLaSemaine([jour]);

    expect(piecesDe(frise, jour)).toEqual([
      { gauche: 12.7, largeur: 24.8 },
      { gauche: 37.5, largeur: 6.3 },
      { gauche: 43.8, largeur: 28.3 },
    ]);
  });

  it('should tell a break apart from a presence', () => {
    const jour = journeeOrdinaireFixture();
    const frise = new FriseDeLaSemaine([jour]);

    expect(jour.plages().map(plage => frise.dessine(plage).pause)).toEqual([false, true, false]);
  });

  it('should draw an interval still in progress as a mark without width', () => {
    const jour = jourFixture([pointageFixture('ARRIVEE', 8)]);
    const frise = new FriseDeLaSemaine([jour]);

    expect(jour.plages().map(plage => frise.dessine(plage))).toEqual([
      { pause: false, ouverte: true, pieces: [{ gauche: 12.5, largeur: 0 }] },
    ]);
  });

  it('should mark every two hours of the working day', () => {
    const frise = new FriseDeLaSemaine([journeeOrdinaireFixture()]);

    expect(frise.reperes().map(repere => repere.libelle)).toEqual([
      '06:00',
      '08:00',
      '10:00',
      '12:00',
      '14:00',
      '16:00',
      '18:00',
      '20:00',
      '22:00',
    ]);
  });

  it('should place each hour mark along the span', () => {
    const frise = new FriseDeLaSemaine([journeeOrdinaireFixture()]);

    expect(frise.reperes().map(repere => arrondi(repere.gauche))).toEqual([0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100]);
  });

  it('should mark every two hours of the whole day, midnight at both ends', () => {
    const frise = new FriseDeLaSemaine([jourFixture([pointageFixture('ARRIVEE', 22), pointageFixture('DEPART', 2)])]);
    const reperes = frise.reperes();

    expect([reperes.length, reperes[0]?.libelle, reperes[reperes.length - 1]?.libelle]).toEqual([13, '00:00', '00:00']);
  });

  /** Sans cet ancrage, la moitié extérieure des repères d'extrémité sort de la cellule et se fait couper. */
  it('should anchor the marks that sit on the edges of the span', () => {
    const frise = new FriseDeLaSemaine([journeeOrdinaireFixture()]);
    const ancrages = frise.reperes().map(repere => repere.ancrage);

    expect([ancrages[0], ancrages[4], ancrages[ancrages.length - 1]]).toEqual(['gauche', 'centre', 'droite']);
  });

  it('should identify each mark by its own minute, two of them sharing a label', () => {
    const frise = new FriseDeLaSemaine([jourFixture([pointageFixture('ARRIVEE', 22), pointageFixture('DEPART', 2)])]);
    const minutes = frise.reperes().map(repere => repere.minutes);

    expect(new Set(minutes).size).toBe(minutes.length);
  });
});
