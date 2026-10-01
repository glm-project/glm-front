import { ElementChiffre } from '../element/ElementChiffre';
import { ElementChiffreId } from '../element/ElementChiffreId';
import { Cout } from '../montant/Cout';
import { Montant } from '../montant/Montant';
import { TotalDeMontant } from '../montant/TotalDeMontant';
import { DureePassee } from '../temps/DureePassee';
import { InstantDeTravail } from '../temps/InstantDeTravail';
import { PeriodeDeTravail } from '../temps/PeriodeDeTravail';
import { TempsPasse } from '../temps/TempsPasse';
import { TotalDeTemps } from '../temps/TotalDeTemps';
import { ActivitesEnCoursExclues } from './ActivitesEnCoursExclues';
import { CoutDeRevient } from './CoutDeRevient';
import { LigneDeCout } from './LigneDeCout';
import { NatureDOperation } from './NatureDOperation';
import { SequenceEnConflit } from './SequenceEnConflit';

const ELEMENT = new ElementChiffre('OF-2026-000001', 'ORDRE_DE_FABRICATION');

const ligneFixture = (nature: string): LigneDeCout =>
  new LigneDeCout({
    nature: new NatureDOperation(nature),
    periode: new PeriodeDeTravail(new InstantDeTravail('2026-05-11T09:00:00Z'), new InstantDeTravail('2026-05-11T11:00:00Z')),
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
    nonConformites: [],
    finsAutomatiques: [],
  });

const rapportFixture = (lignes: readonly LigneDeCout[], enCours = 0, conflits: readonly SequenceEnConflit[] = []): CoutDeRevient =>
  new CoutDeRevient(ELEMENT, {
    lignes,
    evaluation: new InstantDeTravail('2026-05-11T12:00:00Z'),
    activitesEnCours: new ActivitesEnCoursExclues(enCours),
    conflits,
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
  it('should not call a conflicting sequence without interpreted activities an element never clocked on', () => {
    const sequence = new SequenceEnConflit({
      element: new ElementChiffreId('autre-element'),
      operateur: 'operateur-a',
      poste: undefined,
      activites: [],
      pointages: ['pointage-a'],
    });
    const rapport = rapportFixture([], 0, [sequence]);

    expect(rapport.estSansTravail()).toBe(false);
    expect(rapport.conflits).toEqual([sequence]);
  });

  it('should distinguish excluded current activities from an element never clocked on', () => {
    const rapport = rapportFixture([], 1);

    expect(rapport.estSansTravail()).toBe(false);
    expect(rapport.activitesEnCours.nombre).toBe(1);
  });

  it('should keep every diagnostic identity safe from callers changing their input collections', () => {
    const activites = ['activite-a', 'activite-b'];
    const pointages = ['pointage-a', 'pointage-b'];
    const sequence = new SequenceEnConflit({
      element: new ElementChiffreId('autre-element'),
      operateur: 'operateur-a',
      poste: 'poste-a',
      activites,
      pointages,
    });
    const conflits = [sequence];
    const rapport = rapportFixture([], 0, conflits);
    activites.pop();
    pointages.pop();
    conflits.pop();

    expect(rapport.conflits).toEqual([
      {
        element: new ElementChiffreId('autre-element'),
        operateur: 'operateur-a',
        poste: 'poste-a',
        activites: ['activite-a', 'activite-b'],
        pointages: ['pointage-a', 'pointage-b'],
      },
    ]);
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
