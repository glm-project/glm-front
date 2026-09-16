import { RequeteOperateurs } from './RequeteOperateurs';

describe('RequeteOperateurs', () => {
  it.each([-1, 1.5])('should refuse a page that is not a positive integer: %s', page => {
    expect(() => new RequeteOperateurs(page, 20)).toThrow('Le numéro de page doit être un entier positif ou nul.');
  });

  it.each([0, 1.5])('should refuse a size that is not a strictly positive integer: %s', taille => {
    expect(() => new RequeteOperateurs(0, taille)).toThrow('La taille de page doit être un entier strictement positif.');
  });

  it('should accept the first page of a bounded size', () => {
    const requete = new RequeteOperateurs(0, 20);

    expect(requete).toEqual({ page: 0, taille: 20 });
  });
});
