import { CategorieDeProduit } from './CategorieDeProduit';
import { OrdreDesCategories } from './OrdreDesCategories';

const ordreFixture = (...codes: string[]): OrdreDesCategories => new OrdreDesCategories(codes.map(code => new CategorieDeProduit(code)));
const codesOf = (ordre: OrdreDesCategories): string[] => ordre.categories.map(categorie => categorie.value);
const MOULE = new CategorieDeProduit('MOULE');
const OF = new CategorieDeProduit('OF');
const PIECE = new CategorieDeProduit('PIECE');

describe('OrdreDesCategories', () => {
  it('should move a category one place up', () => {
    const ordre = ordreFixture('MOULE', 'OF', 'PIECE');

    expect(codesOf(ordre.apresMontee(PIECE))).toEqual(['MOULE', 'PIECE', 'OF']);
  });

  it('should move a category one place down', () => {
    const ordre = ordreFixture('MOULE', 'OF', 'PIECE');

    expect(codesOf(ordre.apresDescente(MOULE))).toEqual(['OF', 'MOULE', 'PIECE']);
  });

  it('should keep the first category in place when moved up', () => {
    const ordre = ordreFixture('MOULE', 'OF');

    expect(codesOf(ordre.apresMontee(MOULE))).toEqual(['MOULE', 'OF']);
  });

  it('should keep the last category in place when moved down', () => {
    const ordre = ordreFixture('MOULE', 'OF');

    expect(codesOf(ordre.apresDescente(OF))).toEqual(['MOULE', 'OF']);
  });

  it('should keep the order when the category is unknown', () => {
    const ordre = ordreFixture('MOULE', 'OF');

    expect(codesOf(ordre.apresDescente(PIECE))).toEqual(['MOULE', 'OF']);
    expect(codesOf(ordre.apresMontee(PIECE))).toEqual(['MOULE', 'OF']);
  });

  it.each([
    [MOULE, true, false],
    [OF, false, false],
    [PIECE, false, true],
  ])('should tell whether %o is first or last', (categorie, premiere, derniere) => {
    const ordre = ordreFixture('MOULE', 'OF', 'PIECE');

    expect([ordre.estPremiere(categorie), ordre.estDerniere(categorie)]).toEqual([premiere, derniere]);
  });

  it('should not share the collection it was built from', () => {
    const categories = [MOULE];
    const ordre = new OrdreDesCategories(categories);

    categories.push(OF);

    expect(codesOf(ordre)).toEqual(['MOULE']);
  });
});
