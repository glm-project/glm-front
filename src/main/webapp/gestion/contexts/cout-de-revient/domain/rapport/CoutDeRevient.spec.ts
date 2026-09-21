import { ElementChiffre } from '../element/ElementChiffre';
import { Cout } from '../montant/Cout';
import { Montant } from '../montant/Montant';
import { DureePassee } from '../temps/DureePassee';
import { InstantDeTravail } from '../temps/InstantDeTravail';
import { PeriodeDeTravail } from '../temps/PeriodeDeTravail';
import { TempsPasse } from '../temps/TempsPasse';
import { CoutDeRevient } from './CoutDeRevient';
import { LigneDeCout } from './LigneDeCout';
import { NatureDOperation } from './NatureDOperation';

const ELEMENT = new ElementChiffre('OF-2026-000001', 'ORDRE_DE_FABRICATION');

const ligneFixture = (nature: string): LigneDeCout =>
  new LigneDeCout({
    nature: new NatureDOperation(nature),
    periode: new PeriodeDeTravail(new InstantDeTravail('2026-05-11T09:00:00Z'), new InstantDeTravail('2026-05-11T11:00:00Z')),
    temps: new TempsPasse(new DureePassee('PT2H'), new DureePassee('PT0S'), new DureePassee('PT2H')),
    cout: new Cout(new Montant(90), new Montant(40), new Montant(130)),
    nonConformites: [],
  });

const rapportFixture = (lignes: readonly LigneDeCout[]): CoutDeRevient =>
  new CoutDeRevient(ELEMENT, {
    lignes,
    temps: new TempsPasse(new DureePassee('PT4H'), new DureePassee('PT0S'), new DureePassee('PT4H')),
    cout: new Cout(new Montant(180), new Montant(80), new Montant(260)),
  });

describe('CoutDeRevient', () => {
  it('should carry the element the report resolved', () => {
    expect(rapportFixture([]).element.nom).toBe('OF-2026-000001');
  });

  it('should carry the total the server computed, never the sum of its lines', () => {
    const rapport = rapportFixture([ligneFixture('Fraisage'), ligneFixture('Tournage')]);

    expect([rapport.temps.total.minutes, rapport.cout.total.euros]).toEqual([240, 260]);
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
