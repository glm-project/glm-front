import { DureePassee } from './DureePassee';
import { TempsPasse } from './TempsPasse';

describe('TempsPasse', () => {
  it('should keep good work and non conformity apart, and the total the server computed', () => {
    const temps = new TempsPasse(new DureePassee('PT2H'), new DureePassee('PT30M'), new DureePassee('PT2H30M'));

    expect([temps.travail, temps.nonConformite, temps.total]).toEqual(['PT2H', 'PT30M', 'PT2H30M'].map(value => new DureePassee(value)));
  });

  it('should report a rework when time was spent on non conformity', () => {
    const temps = new TempsPasse(new DureePassee('PT1H'), new DureePassee('PT1H'), new DureePassee('PT2H'));

    expect(temps.porteUneNonConformite()).toBe(true);
  });

  it('should report no rework when nothing was redone', () => {
    const temps = new TempsPasse(new DureePassee('PT2H'), new DureePassee('PT0S'), new DureePassee('PT2H'));

    expect(temps.porteUneNonConformite()).toBe(false);
  });
});
