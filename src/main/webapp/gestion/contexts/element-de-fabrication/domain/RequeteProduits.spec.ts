import { CategorieDeProduit } from './CategorieDeProduit';
import { RequeteProduits } from './RequeteProduits';

describe('RequeteProduits', () => {
  it('should read the products of a cycle twenty at a time', () => {
    const requete = new RequeteProduits({ cycle: 'EN_ATELIER', categorie: new CategorieDeProduit('MOULE'), recherche: 'capot', page: 2 });

    expect(requete.taille).toBe(20);
    expect(requete.page).toBe(2);
  });

  it.each([-1, 1.5])('should refuse page %s', page => {
    expect(() => new RequeteProduits({ cycle: 'EN_ATELIER', categorie: undefined, recherche: '', page })).toThrow(
      'Le numéro de page doit être un entier positif ou nul.',
    );
  });

  it.each([
    ['', undefined],
    ['   ', undefined],
    ['  capot ', 'capot'],
  ])('should search %j as %j', (recherche, expected) => {
    expect(new RequeteProduits({ cycle: 'CLOTURE', categorie: undefined, recherche, page: 0 }).rechercheSaisie()).toBe(expected);
  });
});
