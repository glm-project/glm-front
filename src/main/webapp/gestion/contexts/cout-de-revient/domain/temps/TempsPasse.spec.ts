import { DureePassee } from './DureePassee';
import { TempsPasse } from './TempsPasse';
import { TotalDeTemps } from './TotalDeTemps';

describe('TempsPasse', () => {
  it('should keep unresolved non conformity distinct from no rework', () => {
    const temps = new TempsPasse(TotalDeTemps.complet(new DureePassee('PT5H')), TotalDeTemps.incomplet(), TotalDeTemps.incomplet());

    expect(temps.porteUneNonConformite()).toBe(true);
    expect(temps.nonConformite.snapshot()).toEqual({ complete: false });
    expect(temps.travail.snapshot()).toEqual({ complete: true, valeur: new DureePassee('PT5H') });
  });

  it('should keep good work and non conformity apart, and the total the server computed', () => {
    const temps = new TempsPasse(
      TotalDeTemps.complet(new DureePassee('PT2H')),
      TotalDeTemps.complet(new DureePassee('PT30M')),
      TotalDeTemps.complet(new DureePassee('PT2H30M')),
    );

    expect([temps.travail.snapshot(), temps.nonConformite.snapshot(), temps.total.snapshot()]).toEqual(
      ['PT2H', 'PT30M', 'PT2H30M'].map(value => ({ complete: true, valeur: new DureePassee(value) })),
    );
  });

  it('should report a rework when time was spent on non conformity', () => {
    const temps = new TempsPasse(
      TotalDeTemps.complet(new DureePassee('PT1H')),
      TotalDeTemps.complet(new DureePassee('PT1H')),
      TotalDeTemps.complet(new DureePassee('PT2H')),
    );

    expect(temps.porteUneNonConformite()).toBe(true);
  });

  it('should report no rework when nothing was redone', () => {
    const temps = new TempsPasse(
      TotalDeTemps.complet(new DureePassee('PT2H')),
      TotalDeTemps.complet(new DureePassee('PT0S')),
      TotalDeTemps.complet(new DureePassee('PT2H')),
    );

    expect(temps.porteUneNonConformite()).toBe(false);
  });
});
