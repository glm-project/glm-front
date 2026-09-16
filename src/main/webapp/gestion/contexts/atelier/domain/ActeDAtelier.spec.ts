import { ActeDAtelier } from './ActeDAtelier';
import { InstantDAtelier } from './InstantDAtelier';

describe('ActeDAtelier', () => {
  it('should carry when the act happened and who performed it', () => {
    const acte = new ActeDAtelier(new InstantDAtelier('2026-09-14T08:30:00Z'), 'gestionnaire.impeccmold');

    expect(acte.instant.value.toISOString()).toBe('2026-09-14T08:30:00.000Z');
    expect(acte.auteur).toBe('gestionnaire.impeccmold');
  });

  it('should remove surrounding whitespace from the author', () => {
    const acte = new ActeDAtelier(new InstantDAtelier('2026-09-14T08:30:00Z'), '  dupont  ');

    expect(acte.auteur).toBe('dupont');
  });

  it.each(['', '   '])('should refuse an act without an author: %s', auteur => {
    expect(() => new ActeDAtelier(new InstantDAtelier('2026-09-14T08:30:00Z'), auteur)).toThrow(
      'Un acte d’atelier porte toujours son auteur.',
    );
  });
});
