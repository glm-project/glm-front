import { Cout } from '../montant/Cout';
import { Montant } from '../montant/Montant';
import { TotalDeMontant } from '../montant/TotalDeMontant';
import { DureePassee } from '../temps/DureePassee';
import { InstantDeTravail } from '../temps/InstantDeTravail';
import { PeriodeDeTravail } from '../temps/PeriodeDeTravail';
import { TempsPasse } from '../temps/TempsPasse';
import { TotalDeTemps } from '../temps/TotalDeTemps';
import { FicheDeLigne, LigneDeCout } from './LigneDeCout';
import { NatureDOperation } from './NatureDOperation';

const periodeFixture = (debut: string, fin: string): PeriodeDeTravail =>
  new PeriodeDeTravail(new InstantDeTravail(debut), new InstantDeTravail(fin));

const ficheFixture = (nature: NatureDOperation | undefined): FicheDeLigne => ({
  nature,
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
  finsAutomatiques: [],
  pointages: [],
});

describe('LigneDeCout', () => {
  it('should keep automatic periods safe from the caller that supplied them', () => {
    const finsAutomatiques = [periodeFixture('2026-05-11T08:00:00Z', '2026-05-11T21:00:00Z')];
    const ligne = new LigneDeCout({ ...ficheFixture(new NatureDOperation('Fraisage')), finsAutomatiques });
    finsAutomatiques.pop();

    expect(ligne.finsAutomatiques).toEqual([periodeFixture('2026-05-11T08:00:00Z', '2026-05-11T21:00:00Z')]);
  });

  it('should carry everything the report says about one trade', () => {
    const ligne = new LigneDeCout(ficheFixture(new NatureDOperation('Fraisage')));

    expect([ligne.nature?.value, ligne.temps.total.snapshot(), ligne.cout.total.snapshot()]).toEqual([
      'Fraisage',
      { complete: true, valeur: new DureePassee('PT2H') },
      { complete: true, valeur: new Montant(130) },
    ]);
  });

  it('should recognise the line a pointing without a work station produced', () => {
    expect(new LigneDeCout(ficheFixture(undefined)).estSansPoste()).toBe(true);
  });

  it('should not call a line carrying a trade a line without a work station', () => {
    expect(new LigneDeCout(ficheFixture(new NatureDOperation('Tournage'))).estSansPoste()).toBe(false);
  });
});
