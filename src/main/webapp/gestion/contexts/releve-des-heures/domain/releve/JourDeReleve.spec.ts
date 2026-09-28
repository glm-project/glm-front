import { DureeTravaillee } from '../duree/DureeTravaillee';
import { JourCalendaire } from '../semaine/JourCalendaire';
import { InstantDeReleve } from './InstantDeReleve';
import { FicheDuJour, JourDeReleve } from './JourDeReleve';
import { PauseDeReleve } from './PauseDeReleve';
import { PlageDeReleve } from './PlageDeReleve';
import { PointageDeReleve } from './PointageDeReleve';
import { TypeDePointage } from './TypeDePointage';

const instantFixture = (heure: number, minute: number): InstantDeReleve =>
  new InstantDeReleve(new Date(2026, 8, 14, heure, minute).toISOString());

const pointageFixture = (type: TypeDePointage, heure: number, minute: number): PointageDeReleve =>
  new PointageDeReleve(type, instantFixture(heure, minute));

const ficheFixture = (fiche: Partial<FicheDuJour>): FicheDuJour => ({
  jour: new JourCalendaire('2026-09-14'),
  dureePointee: new DureeTravaillee('PT0S'),
  dureePresumee: new DureeTravaillee('PT0S'),
  pointages: [],
  plages: [],
  ...fiche,
});

const heureDe = (instant: InstantDeReleve): string =>
  `${String(instant.value.getHours()).padStart(2, '0')}:${String(instant.value.getMinutes()).padStart(2, '0')}`;

const projeterPause = (pause: PauseDeReleve): string => `veille → ${heureDe(pause.fin)}`;

describe('JourDeReleve', () => {
  it('should keep its clockings independent of the list it was built from', () => {
    const pointages = [pointageFixture('ARRIVEE', 8, 2)];
    const jour = new JourDeReleve(ficheFixture({ pointages }));

    pointages.pop();

    expect(jour.pointages).toHaveLength(1);
  });

  it('should report a day carrying neither clocking nor interval as empty', () => {
    const jour = new JourDeReleve(ficheFixture({}));

    expect(jour.estVide()).toBe(true);
  });

  it('should not report as empty a day that a presence covers without any clocking', () => {
    const plage = new PlageDeReleve(instantFixture(0, 0), instantFixture(23, 59), false);

    const jour = new JourDeReleve(ficheFixture({ plages: [plage] }));

    expect(jour.estVide()).toBe(false);
  });

  it('should not report as empty a working day of zero duration, clocked without any interval', () => {
    const pointages = [pointageFixture('ARRIVEE', 8, 2), pointageFixture('DEPART', 8, 2)];

    const jour = new JourDeReleve(ficheFixture({ pointages }));

    expect(jour.estVide()).toBe(false);
  });

  it('should not take the gap between a departure and a new arrival for a break', () => {
    const jour = new JourDeReleve(
      ficheFixture({
        pointages: [
          pointageFixture('ARRIVEE', 6, 58),
          pointageFixture('DEPART', 11, 58),
          pointageFixture('ARRIVEE', 12, 40),
          pointageFixture('DEPART', 15, 2),
        ],
        plages: [
          new PlageDeReleve(instantFixture(6, 58), instantFixture(11, 58), false),
          new PlageDeReleve(instantFixture(12, 40), instantFixture(15, 2), false),
        ],
      }),
    );

    expect(jour.pauses()).toEqual([]);
  });

  it('should start a day that begins with a departure no interval ends in a break coming from the day before', () => {
    const jour = new JourDeReleve(ficheFixture({ pointages: [pointageFixture('DEPART', 1, 30)] }));

    expect(jour.pauses().map(projeterPause)).toEqual(['veille → 01:30']);
  });

  it('should start in a break from the day before a night shift day whose first departure no interval ends, even with a later interval', () => {
    const jour = new JourDeReleve(
      ficheFixture({
        pointages: [pointageFixture('DEPART', 1, 30), pointageFixture('ARRIVEE', 19, 0)],
        plages: [new PlageDeReleve(instantFixture(19, 0), instantFixture(24, 0), false)],
      }),
    );

    expect(jour.pauses().map(projeterPause)).toEqual(['veille → 01:30']);
  });

  it('should not start a day in a break when an interval ends at its first departure', () => {
    const jour = new JourDeReleve(
      ficheFixture({
        pointages: [pointageFixture('DEPART', 7, 5), pointageFixture('ARRIVEE', 18, 58)],
        plages: [
          new PlageDeReleve(instantFixture(0, 0), instantFixture(7, 5), false),
          new PlageDeReleve(instantFixture(18, 58), instantFixture(24, 0), false),
        ],
      }),
    );

    expect(jour.pauses()).toEqual([]);
  });

  it('should name the clocking that happened at an instant', () => {
    const jour = new JourDeReleve(ficheFixture({ pointages: [pointageFixture('ARRIVEE', 8, 2), pointageFixture('DEPART', 10, 20)] }));

    expect(jour.typeDuPointageA(instantFixture(10, 20))).toBe('DEPART');
  });

  it('should name no clocking at an instant none happened at, such as midnight', () => {
    const jour = new JourDeReleve(ficheFixture({ pointages: [pointageFixture('DEPART', 0, 22)] }));

    expect(jour.typeDuPointageA(instantFixture(0, 0))).toBeUndefined();
  });

  it('should tell an interval no clocking of the day opened, cut at midnight by the server, as coming from the day before', () => {
    const plage = new PlageDeReleve(instantFixture(0, 0), instantFixture(7, 5), false);
    const jour = new JourDeReleve(ficheFixture({ pointages: [pointageFixture('DEPART', 7, 5)], plages: [plage] }));

    expect(jour.vientDeLaVeille(plage)).toBe(true);
  });

  it('should not take an interval opened by an arrival in the first minute after midnight for one coming from the day before', () => {
    const arrivee = new InstantDeReleve(new Date(2026, 8, 14, 0, 0, 40).toISOString());
    const plage = new PlageDeReleve(arrivee, instantFixture(8, 0), false);
    const jour = new JourDeReleve(ficheFixture({ pointages: [new PointageDeReleve('ARRIVEE', arrivee)], plages: [plage] }));

    expect(jour.vientDeLaVeille(plage)).toBe(false);
  });
});
