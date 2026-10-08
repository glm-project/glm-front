import { CategorieDElementChiffre } from '../element/CategorieDElementChiffre';
import { ElementChiffre } from '../element/ElementChiffre';
import { Cout } from '../montant/Cout';
import { Montant } from '../montant/Montant';
import { TotalDeMontant } from '../montant/TotalDeMontant';
import { OperateurCite } from '../pointage/OperateurCite';
import { AnomalieDePointage, PointageDeCout } from '../pointage/PointageDeCout';
import { DureePassee } from '../temps/DureePassee';
import { InstantDeTravail } from '../temps/InstantDeTravail';
import { PeriodeDeTravail } from '../temps/PeriodeDeTravail';
import { TempsPasse } from '../temps/TempsPasse';
import { TotalDeTemps } from '../temps/TotalDeTemps';
import { ActivitesEnCoursExclues } from './ActivitesEnCoursExclues';
import { CoutDeRevient } from './CoutDeRevient';
import { LigneDeCout } from './LigneDeCout';
import { NatureDOperation } from './NatureDOperation';

const ELEMENT = new ElementChiffre('OF-2026-000001', new CategorieDElementChiffre('OF'));

const pointageFixture = (anomalies: readonly AnomalieDePointage[]): PointageDeCout =>
  new PointageDeCout({
    anomalies,
    operateur: new OperateurCite('operateur-1', 'Julien', 'Martin'),
    poste: undefined,
    categorie: 'TRAVAIL',
    periode: new PeriodeDeTravail(new InstantDeTravail('2026-05-11T09:00:00Z'), new InstantDeTravail('2026-05-11T11:00:00Z')),
    finAuPlusTard: undefined,
    duree: TotalDeTemps.complet(new DureePassee('PT2H')),
    coutHoraire: undefined,
    tauxHoraire: undefined,
    cout: new Cout(TotalDeMontant.complet(new Montant(0)), TotalDeMontant.complet(new Montant(0)), TotalDeMontant.complet(new Montant(0))),
    parts: [],
    contradictoires: [],
  });

const ligneFixture = (nature: string, pointages: readonly PointageDeCout[] = []): LigneDeCout =>
  new LigneDeCout({
    nature: new NatureDOperation(nature),
    temps: new TempsPasse(
      TotalDeTemps.complet(new DureePassee('PT2H')),
      TotalDeTemps.complet(new DureePassee('PT0S')),
      TotalDeTemps.complet(new DureePassee('PT2H')),
    ),
    cout: new Cout(
      TotalDeMontant.complet(new Montant(90)),
      TotalDeMontant.complet(new Montant(40)),
      TotalDeMontant.complet(new Montant(130)),
    ),
    pointages,
  });

const rapportFixture = (lignes: readonly LigneDeCout[], enCours = 0): CoutDeRevient =>
  new CoutDeRevient(ELEMENT, {
    lignes,
    evaluation: new InstantDeTravail('2026-05-11T12:00:00Z'),
    activitesEnCours: new ActivitesEnCoursExclues(enCours),
    temps: new TempsPasse(
      TotalDeTemps.complet(new DureePassee('PT4H')),
      TotalDeTemps.complet(new DureePassee('PT0S')),
      TotalDeTemps.complet(new DureePassee('PT4H')),
    ),
    cout: new Cout(
      TotalDeMontant.complet(new Montant(180)),
      TotalDeMontant.complet(new Montant(80)),
      TotalDeMontant.complet(new Montant(260)),
    ),
  });

describe('CoutDeRevient', () => {
  it('should distinguish excluded current activities from an element never clocked on', () => {
    const rapport = rapportFixture([], 1);

    expect(rapport.estSansTravail()).toBe(false);
    expect(rapport.activitesEnCours.nombre).toBe(1);
  });

  it('should name the lines whose clockings carry an anomaly, in the order the server sent them', () => {
    const rapport = rapportFixture([
      ligneFixture('Tournage', [pointageFixture(['A_RESOUDRE'])]),
      ligneFixture('Fraisage', [pointageFixture([])]),
      ligneFixture('Polissage', [pointageFixture(['FIN_AUTOMATIQUE'])]),
    ]);

    expect(rapport.lignesEnAnomalie().map(ligne => ligne.nature?.value)).toEqual(['Tournage', 'Polissage']);
  });

  it('should carry the element the report resolved', () => {
    expect(rapportFixture([]).element.nom).toBe('OF-2026-000001');
  });

  it('should carry the total the server computed, never the sum of its lines', () => {
    const rapport = rapportFixture([ligneFixture('Fraisage'), ligneFixture('Tournage')]);

    expect([rapport.temps.total.snapshot(), rapport.cout.total.snapshot()]).toEqual([
      { complete: true, valeur: new DureePassee('PT4H') },
      { complete: true, valeur: new Montant(260) },
    ]);
  });

  it('should keep its lines in the order the server sent them', () => {
    const rapport = rapportFixture([ligneFixture('Tournage'), ligneFixture('Fraisage')]);

    expect(rapport.lignes.map(ligne => ligne.nature?.value)).toEqual(['Tournage', 'Fraisage']);
  });

  it('should report an element nobody has clocked on yet as carrying no work', () => {
    expect(rapportFixture([]).estSansTravail()).toBe(true);
  });

  it('should not call a report carrying a line a report without work', () => {
    expect(rapportFixture([ligneFixture('Fraisage')]).estSansTravail()).toBe(false);
  });

  it('should keep its lines safe from the caller that handed them over', () => {
    const lignes = [ligneFixture('Fraisage')];
    const rapport = rapportFixture(lignes);

    lignes.pop();

    expect(rapport.lignes).toHaveLength(1);
  });
});
