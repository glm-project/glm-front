import { Cout } from '../montant/Cout';
import { Montant } from '../montant/Montant';
import { DureePassee } from '../temps/DureePassee';
import { InstantDeTravail } from '../temps/InstantDeTravail';
import { PeriodeDeTravail } from '../temps/PeriodeDeTravail';
import { TempsPasse } from '../temps/TempsPasse';
import { FicheDeLigne, LigneDeCout } from './LigneDeCout';
import { NatureDOperation } from './NatureDOperation';

const periodeFixture = (debut: string, fin: string): PeriodeDeTravail =>
  new PeriodeDeTravail(new InstantDeTravail(debut), new InstantDeTravail(fin));

const ficheFixture = (nature: NatureDOperation | undefined, nonConformites: readonly PeriodeDeTravail[] = []): FicheDeLigne => ({
  nature,
  periode: periodeFixture('2026-05-11T09:00:00Z', '2026-05-11T11:00:00Z'),
  temps: new TempsPasse(new DureePassee('PT2H'), new DureePassee('PT0S'), new DureePassee('PT2H')),
  cout: new Cout(new Montant(90), new Montant(40), new Montant(130)),
  nonConformites,
});

describe('LigneDeCout', () => {
  it('should carry everything the report says about one trade', () => {
    const ligne = new LigneDeCout(ficheFixture(new NatureDOperation('Fraisage')));

    expect([ligne.nature?.value, ligne.temps.total.minutes, ligne.cout.total.euros]).toEqual(['Fraisage', 120, 130]);
  });

  it('should recognise the line a pointing without a work station produced', () => {
    expect(new LigneDeCout(ficheFixture(undefined)).estSansPoste()).toBe(true);
  });

  it('should not call a line carrying a trade a line without a work station', () => {
    expect(new LigneDeCout(ficheFixture(new NatureDOperation('Tournage'))).estSansPoste()).toBe(false);
  });

  it('should keep its rework periods safe from the caller that handed them over', () => {
    const nonConformites = [periodeFixture('2026-05-11T10:00:00Z', '2026-05-11T11:00:00Z')];
    const ligne = new LigneDeCout(ficheFixture(new NatureDOperation('Fraisage'), nonConformites));

    nonConformites.pop();

    expect(ligne.nonConformites).toHaveLength(1);
  });
});
