import { CategorieDeProduit } from './CategorieDeProduit';
import { ReferentielDesProduits } from './ReferentielDesProduits';

describe('ReferentielDesProduits', () => {
  it('should keep the categories in the order the company chose', () => {
    const referentiel = new ReferentielDesProduits([new CategorieDeProduit('OF'), new CategorieDeProduit('MOULE')], []);

    expect(referentiel.categories.map(categorie => categorie.value)).toEqual(['OF', 'MOULE']);
    expect(referentiel.estSansCategorie()).toBe(false);
  });

  it('should be without category while the company has declared none', () => {
    const referentiel = new ReferentielDesProduits([], []);

    expect(referentiel.estSansCategorie()).toBe(true);
  });

  it('should not share the collections it was built from', () => {
    const categories = [new CategorieDeProduit('MOULE')];
    const referentiel = new ReferentielDesProduits(categories, []);

    categories.push(new CategorieDeProduit('OF'));

    expect(referentiel.categories).toHaveLength(1);
  });
});
