import { DureeTravaillee } from '../duree/DureeTravaillee';
import { JourCalendaire } from '../semaine/JourCalendaire';
import { InstantDeReleve } from './InstantDeReleve';
import { JourDeReleve } from './JourDeReleve';
import { PointageDeReleve } from './PointageDeReleve';
import { TypeDePointage } from './TypeDePointage';

const pointageFixture = (type: TypeDePointage, heure: number, minute: number): PointageDeReleve =>
  new PointageDeReleve(type, new InstantDeReleve(new Date(2026, 8, 14, heure, minute).toISOString()));

const jourFixture = (pointages: readonly PointageDeReleve[]): JourDeReleve =>
  new JourDeReleve(new JourCalendaire('2026-09-14'), new DureeTravaillee('PT7H30M'), pointages);

interface ProjectionPlage {
  readonly debut: string;
  readonly fin: string;
  readonly pause: boolean;
}

const heureDe = (instant: InstantDeReleve | undefined): string =>
  instant === undefined
    ? 'ouverte'
    : `${String(instant.value.getHours()).padStart(2, '0')}:${String(instant.value.getMinutes()).padStart(2, '0')}`;

const projeter = (jour: JourDeReleve): ProjectionPlage[] =>
  jour.plages().map(plage => ({ debut: heureDe(plage.debut), fin: heureDe(plage.fin), pause: plage.pause }));

describe('JourDeReleve', () => {
  it('should report a day carrying no clocking as a day without clocking', () => {
    const jour = jourFixture([]);

    expect(jour.estSansPointage()).toBe(true);
  });

  it('should report a day carrying a clocking as a worked day', () => {
    const jour = jourFixture([pointageFixture('ARRIVEE', 8, 2)]);

    expect(jour.estSansPointage()).toBe(false);
  });

  it('should keep its clockings independent of the list it was built from', () => {
    const pointages = [pointageFixture('ARRIVEE', 8, 2)];
    const jour = jourFixture(pointages);

    pointages.pop();

    expect(jour.pointages).toHaveLength(1);
  });

  it('should draw no interval for a day without clocking', () => {
    const jour = jourFixture([]);

    expect(jour.plages()).toEqual([]);
  });

  it('should draw the presence a departure closes', () => {
    const jour = jourFixture([pointageFixture('ARRIVEE', 8, 2), pointageFixture('DEPART', 17, 32)]);

    expect(projeter(jour)).toEqual([{ debut: '08:02', fin: '17:32', pause: false }]);
  });

  it('should draw the break that cuts a presence in two', () => {
    const jour = jourFixture([
      pointageFixture('ARRIVEE', 8, 2),
      pointageFixture('PAUSE', 12, 0),
      pointageFixture('REPRISE', 13, 0),
      pointageFixture('DEPART', 17, 32),
    ]);

    expect(projeter(jour)).toEqual([
      { debut: '08:02', fin: '12:00', pause: false },
      { debut: '12:00', fin: '13:00', pause: true },
      { debut: '13:00', fin: '17:32', pause: false },
    ]);
  });

  it('should draw every break of a day carrying several', () => {
    const jour = jourFixture([
      pointageFixture('ARRIVEE', 8, 0),
      pointageFixture('PAUSE', 10, 0),
      pointageFixture('REPRISE', 10, 15),
      pointageFixture('PAUSE', 12, 0),
      pointageFixture('REPRISE', 13, 0),
      pointageFixture('DEPART', 17, 0),
    ]);

    expect(projeter(jour).filter(plage => plage.pause)).toEqual([
      { debut: '10:00', fin: '10:15', pause: true },
      { debut: '12:00', fin: '13:00', pause: true },
    ]);
  });

  it('should leave the last interval of a day still in progress open', () => {
    const jour = jourFixture([pointageFixture('ARRIVEE', 8, 2)]);

    expect(projeter(jour)).toEqual([{ debut: '08:02', fin: 'ouverte', pause: false }]);
  });

  it('should leave an unclosed break open', () => {
    const jour = jourFixture([pointageFixture('ARRIVEE', 8, 2), pointageFixture('PAUSE', 12, 0)]);

    expect(projeter(jour)).toEqual([
      { debut: '08:02', fin: '12:00', pause: false },
      { debut: '12:00', fin: 'ouverte', pause: true },
    ]);
  });

  it('should tell an open interval from a closed one', () => {
    const jour = jourFixture([pointageFixture('ARRIVEE', 8, 2)]);

    expect(jour.plages().map(plage => plage.estOuverte())).toEqual([true]);
  });

  it('should still draw something from an inconsistent journal rather than nothing', () => {
    const jour = jourFixture([pointageFixture('REPRISE', 13, 0), pointageFixture('DEPART', 17, 32)]);

    expect(projeter(jour)).toEqual([{ debut: '13:00', fin: '17:32', pause: false }]);
  });
});
