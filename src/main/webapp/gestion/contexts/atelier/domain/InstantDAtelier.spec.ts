import { InstantDAtelier } from './InstantDAtelier';

describe('InstantDAtelier', () => {
  it('should read an instant sent by the server', () => {
    const instant = new InstantDAtelier('2026-09-14T08:30:00Z');

    expect(instant.value.toISOString()).toBe('2026-09-14T08:30:00.000Z');
  });

  it.each(['', 'hier matin', '2026-13-45T99:99:99Z'])('should refuse an unreadable instant: %s', value => {
    expect(() => new InstantDAtelier(value)).toThrow('L’instant reçu du serveur n’est pas une date valide.');
  });
});
