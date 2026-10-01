import { Identifiant } from './Identifiant';

describe('Identifiant', () => {
  it.each(['0', '7', '007', '123456'])('should accept one to six digits: %s', value => {
    const identifiant = new Identifiant(value);

    expect(identifiant.value).toBe(value);
  });

  it('should keep leading zeros', () => {
    expect(new Identifiant('007').value).not.toBe(new Identifiant('7').value);
  });

  it('should trim the surrounding whitespace of an identifier', () => {
    const identifiant = new Identifiant('  049  ');

    expect(identifiant.value).toBe('049');
  });

  it.each(['', '   ', '1234567', '12A', 'AB-12', '12 3'])('should refuse anything but one to six digits: %s', value => {
    expect(() => new Identifiant(value)).toThrow("L'identifiant contient de 1 à 6 chiffres.");
  });

  it.each([
    ['007', '007'],
    ['a1b2', '12'],
    ['AB-12', '12'],
    ['1234567', '123456'],
    ['abc', ''],
  ])('should keep only the first six digits typed: %s', (frappe, saisie) => {
    expect(Identifiant.saisie(frappe)).toBe(saisie);
  });
});
