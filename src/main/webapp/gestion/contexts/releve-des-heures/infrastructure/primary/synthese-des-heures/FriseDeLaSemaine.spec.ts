import { DureeTravaillee } from '../../../domain/duree/DureeTravaillee';
import { InstantDeReleve } from '../../../domain/releve/InstantDeReleve';
import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { PointageDeReleve } from '../../../domain/releve/PointageDeReleve';
import { TypeDePointage } from '../../../domain/releve/TypeDePointage';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { FriseDeLaSemaine } from './FriseDeLaSemaine';

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
  it('should span the hours the week actually covers', () => {
    const frise = new FriseDeLaSemaine([journeeOrdinaireFixture()]);

    expect([frise.debut, frise.fin]).toEqual([8 * 60, 18 * 60]);
  });

  it('should span the working day when the week carries no clocking', () => {
    const frise = new FriseDeLaSemaine([jourFixture([])]);

    expect([frise.debut, frise.fin]).toEqual([6 * 60, 22 * 60]);
  });

  it('should widen a span too narrow to read', () => {
    const frise = new FriseDeLaSemaine([jourFixture([pointageFixture('ARRIVEE', 8), pointageFixture('DEPART', 9)])]);

    expect([frise.debut, frise.fin]).toEqual([8 * 60, 16 * 60]);
  });

  it('should span the whole day as soon as a shift crosses midnight', () => {
    const frise = new FriseDeLaSemaine([jourFixture([pointageFixture('ARRIVEE', 22), pointageFixture('DEPART', 2)])]);

    expect([frise.debut, frise.fin]).toEqual([0, 24 * 60]);
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
      { gauche: 0.3, largeur: 39.7 },
      { gauche: 40, largeur: 10 },
      { gauche: 50, largeur: 45.3 },
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
      { pause: false, ouverte: true, pieces: [{ gauche: 0, largeur: 0 }] },
    ]);
  });

  it('should mark the hours every two hours across the span', () => {
    const frise = new FriseDeLaSemaine([journeeOrdinaireFixture()]);

    expect(frise.reperes().map(repere => repere.libelle)).toEqual(['08:00', '10:00', '12:00', '14:00', '16:00', '18:00']);
  });

  it('should place each hour mark along the span', () => {
    const frise = new FriseDeLaSemaine([journeeOrdinaireFixture()]);

    expect(frise.reperes().map(repere => arrondi(repere.gauche))).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it('should span the hours of the widest day of the week', () => {
    const frise = new FriseDeLaSemaine([
      jourFixture([pointageFixture('ARRIVEE', 9), pointageFixture('DEPART', 17)]),
      jourFixture([pointageFixture('ARRIVEE', 6, 30), pointageFixture('DEPART', 19, 15)]),
    ]);

    expect([frise.debut, frise.fin]).toEqual([6 * 60, 20 * 60]);
  });
});
