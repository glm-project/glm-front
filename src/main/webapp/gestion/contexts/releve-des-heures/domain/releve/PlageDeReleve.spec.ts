import { InstantDeReleve } from './InstantDeReleve';
import { PlageDeReleve } from './PlageDeReleve';

const instantFixture = (heure: string): InstantDeReleve => new InstantDeReleve(`2026-09-14T${heure}:00Z`);

describe('PlageDeReleve', () => {
  it('should refuse a presumed interval without an end', () => {
    expect(() => new PlageDeReleve(instantFixture('08:20'), undefined, true)).toThrow('La plage reçue du serveur est présumée sans fin.');
  });

  it('should accept an open interval as a presence still in progress', () => {
    const plage = new PlageDeReleve(instantFixture('08:20'), undefined, false);

    expect(plage.estOuverte()).toBe(true);
  });

  it('should refuse an interval ending before it starts', () => {
    expect(() => new PlageDeReleve(instantFixture('08:20'), instantFixture('08:19'), false)).toThrow(
      'La plage reçue du serveur finit avant de commencer.',
    );
  });

  it('should accept an interval of zero duration', () => {
    const plage = new PlageDeReleve(instantFixture('08:20'), instantFixture('08:20'), false);

    expect(plage.fin?.value.toISOString()).toBe('2026-09-14T08:20:00.000Z');
  });
});
