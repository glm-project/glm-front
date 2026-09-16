import { RequeteEngageables } from './RequeteEngageables';

describe('RequeteEngageables', () => {
  it('should keep the page it was asked for', () => {
    const requete = new RequeteEngageables(1, 10);

    expect(requete.page).toBe(1);
    expect(requete.taille).toBe(10);
  });

  it.each([-1, 1.5])('should refuse an invalid page: %s', page => {
    expect(() => new RequeteEngageables(page, 20)).toThrow('Le numéro de page doit être un entier positif ou nul.');
  });

  it.each([0, -5, 2.5])('should refuse an invalid size: %s', taille => {
    expect(() => new RequeteEngageables(0, taille)).toThrow('La taille de page doit être un entier strictement positif.');
  });
});
