import { DureeTravaillee } from '../duree/DureeTravaillee';
import { JourCalendaire } from '../semaine/JourCalendaire';
import { InstantDeReleve } from './InstantDeReleve';
import { FicheDuJour, JourDeReleve } from './JourDeReleve';
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
});
