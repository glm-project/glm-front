import { CategorieDElementChiffre } from '../element/CategorieDElementChiffre';
import { ElementChiffre } from '../element/ElementChiffre';
import { Cout } from '../montant/Cout';
import { Montant } from '../montant/Montant';
import { OperateurCite } from '../pointage/OperateurCite';
import { AnomalieDePointage, PointageDeCout } from '../pointage/PointageDeCout';
import { PosteCite } from '../pointage/PosteCite';
import { DureePassee } from '../temps/DureePassee';
import { InstantDeTravail } from '../temps/InstantDeTravail';
import { PeriodeDeTravail } from '../temps/PeriodeDeTravail';
import { TempsPasse } from '../temps/TempsPasse';
import { ActivitesEnCoursExclues } from './ActivitesEnCoursExclues';
import { CoutDeRevient } from './CoutDeRevient';
import { LigneDeCout } from './LigneDeCout';
import { NatureDOperation } from './NatureDOperation';

const ELEMENT = new ElementChiffre('OF-2026-000001', new CategorieDElementChiffre('OF'));

interface TarifsFixture {
  readonly poste?: PosteCite | undefined;
  readonly coutHoraire?: Montant | undefined;
  readonly tauxHoraire?: Montant | undefined;
}

const TARIFS_COMPLETS: TarifsFixture = {
  poste: new PosteCite('poste-1', 'DMG'),
  coutHoraire: new Montant(0),
  tauxHoraire: new Montant(35),
};

const pointageFixture = (anomalies: readonly AnomalieDePointage[], tarifs: TarifsFixture = {}): PointageDeCout =>
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
    ...tarifs,
  });

const ligneFixture = (nature: string, pointages: readonly PointageDeCout[] = []): LigneDeCout =>
  new LigneDeCout({
    nature: new NatureDOperation(nature),
    temps: new TempsPasse(new DureePassee('PT2H'), new DureePassee('PT0S'), new DureePassee('PT2H')),
    cout: new Cout(new Montant(90), new Montant(40), new Montant(130)),
    pointages,
  });

const rapportFixture = (lignes: readonly LigneDeCout[], enCours = 0): CoutDeRevient =>
  new CoutDeRevient(ELEMENT, {
    lignes,
    evaluation: new InstantDeTravail('2026-05-11T12:00:00Z'),
    activitesEnCours: new ActivitesEnCoursExclues(enCours),
    temps: new TempsPasse(new DureePassee('PT4H'), new DureePassee('PT0S'), new DureePassee('PT4H')),
    cout: new Cout(new Montant(180), new Montant(80), new Montant(260)),
  });

describe('CoutDeRevient', () => {
  it('should distinguish excluded current activities from an element never clocked on', () => {
    const rapport = rapportFixture([], 1);

    expect(rapport.estSansTravail()).toBe(false);
    expect(rapport.activitesEnCours.nombre).toBe(1);
  });

  it('should name the lines whose clockings carry an anomaly, in the order the server sent them', () => {
    const rapport = rapportFixture([
      ligneFixture('Tournage', [pointageFixture(['FIN_AUTOMATIQUE'])]),
      ligneFixture('Fraisage', [pointageFixture([])]),
      ligneFixture('Polissage', [pointageFixture(['FIN_AUTOMATIQUE'])]),
    ]);

    expect(rapport.lignesEnAnomalie().map(ligne => ligne.nature?.value)).toEqual(['Tournage', 'Polissage']);
  });

  it('should be exportable when no clocking ends automatically and every rate is known, a zero cost included', () => {
    const rapport = rapportFixture([ligneFixture('Fraisage', [pointageFixture([], TARIFS_COMPLETS)])]);

    expect([rapport.estExportable(), rapport.finsAutomatiques(), rapport.tarifsManquants()]).toEqual([true, 0, 0]);
  });

  it('should not be exportable while a clocking ends automatically', () => {
    const rapport = rapportFixture([
      ligneFixture('Fraisage', [pointageFixture(['FIN_AUTOMATIQUE'], TARIFS_COMPLETS), pointageFixture([], TARIFS_COMPLETS)]),
      ligneFixture('Tournage', [pointageFixture(['FIN_AUTOMATIQUE'], TARIFS_COMPLETS)]),
    ]);

    expect([rapport.estExportable(), rapport.finsAutomatiques(), rapport.tarifsManquants()]).toEqual([false, 2, 0]);
  });

  it.each([
    ['the operator rate', { ...TARIFS_COMPLETS, tauxHoraire: undefined }],
    ['the workstation cost', { ...TARIFS_COMPLETS, coutHoraire: undefined }],
  ])('should not be exportable while a clocking misses %s', (_tarif, tarifs) => {
    const rapport = rapportFixture([ligneFixture('Fraisage', [pointageFixture([], tarifs), pointageFixture([], TARIFS_COMPLETS)])]);

    expect([rapport.estExportable(), rapport.finsAutomatiques(), rapport.tarifsManquants()]).toEqual([false, 0, 1]);
  });

  it('should not ask a workstation cost of a clocking without workstation', () => {
    const rapport = rapportFixture([ligneFixture('Fraisage', [pointageFixture([], { tauxHoraire: new Montant(35) })])]);

    expect(rapport.estExportable()).toBe(true);
  });

  it('should carry the element the report resolved', () => {
    expect(rapportFixture([]).element.nom).toBe('OF-2026-000001');
  });

  it('should carry the total the server computed, never the sum of its lines', () => {
    const rapport = rapportFixture([ligneFixture('Fraisage'), ligneFixture('Tournage')]);

    expect([rapport.temps.total, rapport.cout.total]).toEqual([new DureePassee('PT4H'), new Montant(260)]);
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
