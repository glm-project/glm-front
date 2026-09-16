import { NomDElement } from './NomDElement';

describe('NomDElement', () => {
  it('should accept the number produced by the domain', () => {
    const nom = new NomDElement('PRD-2026-000001');

    expect(nom.value).toBe('PRD-2026-000001');
  });

  it('should remove surrounding whitespace from the produced number', () => {
    const nom = new NomDElement('  OF-2026-000042  ');

    expect(nom.value).toBe('OF-2026-000042');
  });

  it.each(['', '   '])('should refuse a missing produced number: %s', value => {
    expect(() => new NomDElement(value)).toThrow('Le nom produit par le domaine est obligatoire.');
  });
});
