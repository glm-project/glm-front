import { Montant } from '../montant/Montant';
import { DureePassee } from '../temps/DureePassee';
import { InstantDeTravail } from '../temps/InstantDeTravail';
import { FicheDePart, PartDePointage } from './PartDePointage';

const ficheFixture = (diviseur: number): FicheDePart => ({
  debut: new InstantDeTravail('2026-09-12T09:00:00Z'),
  fin: new InstantDeTravail('2026-09-12T10:30:00Z'),
  duree: new DureePassee('PT1H30M'),
  diviseur,
  mainDOeuvre: new Montant(26.25),
  paralleles: [],
});

describe('PartDePointage', () => {
  it('should tell a share run alongside another work station', () => {
    expect(new PartDePointage(ficheFixture(2)).estPartagee()).toBe(true);
  });

  it('should not call a share run on a single work station shared', () => {
    const part = new PartDePointage(ficheFixture(1));

    expect(part.estPartagee()).toBe(false);
  });

  it.each([0, 1.5, -2])('should reject %s, which is no number of work stations', diviseur => {
    expect(() => new PartDePointage(ficheFixture(diviseur))).toThrow(
      `Le diviseur « ${String(diviseur)} » reçu du serveur n’est pas un nombre de postes.`,
    );
  });

  it('should keep its parallel activities safe from the caller', () => {
    const paralleles: never[] = [];
    const part = new PartDePointage({ ...ficheFixture(2), paralleles });
    paralleles.length = 0;

    expect(part.paralleles).not.toBe(paralleles);
  });
});
