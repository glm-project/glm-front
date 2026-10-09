import { Cout } from '../montant/Cout';
import { Montant } from '../montant/Montant';
import { OperateurCite } from '../pointage/OperateurCite';
import { AnomalieDePointage, PointageDeCout } from '../pointage/PointageDeCout';
import { DureePassee } from '../temps/DureePassee';
import { InstantDeTravail } from '../temps/InstantDeTravail';
import { PeriodeDeTravail } from '../temps/PeriodeDeTravail';
import { TempsPasse } from '../temps/TempsPasse';
import { FicheDeLigne, LigneDeCout } from './LigneDeCout';
import { NatureDOperation } from './NatureDOperation';

const pointageFixture = (anomalies: readonly AnomalieDePointage[]): PointageDeCout =>
  new PointageDeCout({
    anomalies,
    operateur: new OperateurCite('operateur-1', 'Julien', 'Martin'),
    poste: undefined,
    categorie: 'TRAVAIL',
    periode: new PeriodeDeTravail(new InstantDeTravail('2026-05-11T09:00:00Z'), new InstantDeTravail('2026-05-11T11:00:00Z')),
    duree: new DureePassee('PT2H'),
    coutHoraire: undefined,
    tauxHoraire: undefined,
    cout: new Cout(new Montant(0), new Montant(0), new Montant(0)),
    parts: [],
  });

const ficheFixture = (nature: NatureDOperation | undefined, pointages: readonly PointageDeCout[] = []): FicheDeLigne => ({
  nature,
  temps: new TempsPasse(new DureePassee('PT2H'), new DureePassee('PT0S'), new DureePassee('PT2H')),
  cout: new Cout(new Montant(90), new Montant(40), new Montant(130)),
  pointages,
});

describe('LigneDeCout', () => {
  it('should count its clockings by anomaly, leaving out the absent ones', () => {
    const ligne = new LigneDeCout(
      ficheFixture(new NatureDOperation('Électroérosion'), [
        pointageFixture(['FIN_AUTOMATIQUE']),
        pointageFixture([]),
        pointageFixture(['FIN_AUTOMATIQUE']),
      ]),
    );

    expect(ligne.anomalies()).toEqual([{ anomalie: 'FIN_AUTOMATIQUE', nombre: 2 }]);
    expect([ligne.pointagesEnAnomalie(), ligne.porteDesAnomalies()]).toEqual([2, true]);
  });

  it('should not call a line whose clockings carry no anomaly a line in anomaly', () => {
    const ligne = new LigneDeCout(ficheFixture(new NatureDOperation('Fraisage'), [pointageFixture([])]));

    expect([ligne.anomalies(), ligne.porteDesAnomalies()]).toEqual([[], false]);
  });

  it('should keep its clockings safe from the caller that supplied them', () => {
    const pointages = [pointageFixture([])];
    const ligne = new LigneDeCout(ficheFixture(new NatureDOperation('Fraisage'), pointages));
    pointages.pop();

    expect(ligne.pointages).toHaveLength(1);
  });

  it('should carry everything the report says about one trade', () => {
    const ligne = new LigneDeCout(ficheFixture(new NatureDOperation('Fraisage')));

    expect([ligne.nature?.value, ligne.temps.total, ligne.cout.total]).toEqual(['Fraisage', new DureePassee('PT2H'), new Montant(130)]);
  });

  it('should recognise the line a pointing without a work station produced', () => {
    expect(new LigneDeCout(ficheFixture(undefined)).estSansPoste()).toBe(true);
  });

  it('should not call a line carrying a trade a line without a work station', () => {
    expect(new LigneDeCout(ficheFixture(new NatureDOperation('Tournage'))).estSansPoste()).toBe(false);
  });
});
