import { Cout } from '../montant/Cout';
import { Montant } from '../montant/Montant';
import { DureePassee } from '../temps/DureePassee';
import { InstantDeTravail } from '../temps/InstantDeTravail';
import { PeriodeDeTravail } from '../temps/PeriodeDeTravail';
import { OperateurCite } from './OperateurCite';
import { PartDePointage } from './PartDePointage';
import { AnomalieDePointage, CategorieDePointage, FicheDePointage, PointageDeCout } from './PointageDeCout';

const partFixture = (debut: string, fin: string, diviseur: number): PartDePointage =>
  new PartDePointage({
    debut: new InstantDeTravail(debut),
    fin: new InstantDeTravail(fin),
    duree: new DureePassee('PT1H'),
    diviseur,
    mainDOeuvre: new Montant(35),
    paralleles: [],
  });

const ficheFixture = (
  parts: readonly PartDePointage[],
  categorie: CategorieDePointage = 'TRAVAIL',
  anomalies: readonly AnomalieDePointage[] = [],
): FicheDePointage => ({
  anomalies,
  operateur: new OperateurCite('operateur-1', 'Julien', 'Martin'),
  poste: undefined,
  categorie,
  periode: new PeriodeDeTravail(new InstantDeTravail('2026-09-12T07:30:00Z'), new InstantDeTravail('2026-09-12T09:30:00Z')),
  duree: new DureePassee('PT2H'),
  coutHoraire: new Montant(48),
  tauxHoraire: new Montant(35),
  cout: new Cout(new Montant(96), new Montant(70), new Montant(166)),
  parts,
});

describe('PointageDeCout', () => {
  it('should not detail the sharing of a clocking run alone from start to finish', () => {
    expect(new PointageDeCout(ficheFixture([partFixture('2026-09-12T07:30:00Z', '2026-09-12T09:30:00Z', 1)])).detailleSonPartage()).toBe(
      false,
    );
  });

  it('should detail the sharing of a clocking whose divisor changed', () => {
    const pointage = new PointageDeCout(
      ficheFixture([
        partFixture('2026-09-12T07:30:00Z', '2026-09-12T08:30:00Z', 1),
        partFixture('2026-09-12T08:30:00Z', '2026-09-12T09:30:00Z', 1),
      ]),
    );

    expect(pointage.detailleSonPartage()).toBe(true);
  });

  it('should detail the sharing of a clocking shared from start to finish', () => {
    expect(new PointageDeCout(ficheFixture([partFixture('2026-09-12T07:30:00Z', '2026-09-12T09:30:00Z', 2)])).detailleSonPartage()).toBe(
      true,
    );
  });

  it('should tell the anomalies a clocking carries', () => {
    const pointage = new PointageDeCout(ficheFixture([], 'TRAVAIL', ['FIN_AUTOMATIQUE']));

    expect([pointage.porte('FIN_AUTOMATIQUE'), pointage.estEnAnomalie()]).toEqual([true, true]);
  });

  it('should not call a clocking without anomaly a clocking in anomaly', () => {
    expect(new PointageDeCout(ficheFixture([])).estEnAnomalie()).toBe(false);
  });

  it('should tell a rework clocking', () => {
    expect([
      new PointageDeCout(ficheFixture([], 'NON_CONFORMITE')).estUneNonConformite(),
      new PointageDeCout(ficheFixture([])).estUneNonConformite(),
    ]).toEqual([true, false]);
  });

  it('should keep its shares safe from the caller that supplied them', () => {
    const parts = [partFixture('2026-09-12T07:30:00Z', '2026-09-12T09:30:00Z', 1)];
    const pointage = new PointageDeCout(ficheFixture(parts));
    parts.pop();

    expect(pointage.parts).toHaveLength(1);
  });
});
