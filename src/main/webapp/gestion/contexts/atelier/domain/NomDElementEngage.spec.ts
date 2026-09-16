import { NomDElementEngage } from './NomDElementEngage';

describe('NomDElementEngage', () => {
  it('should keep the name copied at engagement', () => {
    const nom = new NomDElementEngage('OF-2026-000042');

    expect(nom.value).toBe('OF-2026-000042');
  });

  it('should remove surrounding whitespace from the copied name', () => {
    const nom = new NomDElementEngage('  PRD-2026-000001  ');

    expect(nom.value).toBe('PRD-2026-000001');
  });

  it.each(['', '   '])('should refuse a missing copied name: %s', value => {
    expect(() => new NomDElementEngage(value)).toThrow('Le nom copié à l’engagement ne peut pas être vide.');
  });
});
