import { DesignationDElement } from './DesignationDElement';

describe('DesignationDElement', () => {
  it('should prefer the company number when the element has one', () => {
    const designation = new DesignationDElement('1015', 'PRD-2026-000001');

    expect(designation.value).toBe('1015');
  });

  it.each([undefined, '', '   '])('should fall back to the produced name when the company number is missing: %s', reference => {
    const designation = new DesignationDElement(reference, 'PRD-2026-000001');

    expect(designation.value).toBe('PRD-2026-000001');
  });

  it('should remove surrounding whitespace from the designation it keeps', () => {
    const designation = new DesignationDElement('  1015  ', 'PRD-2026-000001');

    expect(designation.value).toBe('1015');
  });

  it('should refuse an element that carries neither a company number nor a name', () => {
    expect(() => new DesignationDElement(undefined, '  ')).toThrow('Un élément se désigne par sa référence ou, à défaut, par son nom.');
  });
});
