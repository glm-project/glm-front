import { PosteHabilitable } from './PosteHabilitable';
import { PosteHabilitableId } from './PosteHabilitableId';

const posteFixture = (libelle: string, nature: string): PosteHabilitable =>
  new PosteHabilitable(new PosteHabilitableId(libelle), { libelle, nature });

describe('PosteHabilitable', () => {
  it('should carry the label and the trade resolved by the server', () => {
    const poste = posteFixture('Tour 1', 'tournage');

    expect(poste.libelle).toBe('Tour 1');
    expect(poste.nature).toBe('tournage');
  });

  it('should order workstations by label in French alphabetical order', () => {
    const postes = [posteFixture('Établi', 'ébavurage'), posteFixture('Tour 1', 'tournage'), posteFixture('Scie 1', 'sciage')];

    expect([...postes].sort((left, right) => left.compare(right)).map(poste => poste.libelle)).toEqual(['Établi', 'Scie 1', 'Tour 1']);
  });

  it.each([
    ['a label fragment', 'tou', true],
    ['a differently cased fragment', 'TOUR', true],
    ['a fragment surrounded by spaces', '  Tour  ', true],
    ['the whole label', 'Tour 1', true],
    ['the trade', 'tournage', true],
    ['an unrelated term', 'soudage', false],
    ['a term longer than the label', 'Tour 1 et demi', false],
  ])('should match %s: %s', (_intention, recherche, expected) => {
    expect(posteFixture('Tour 1', 'tournage').correspondA(recherche)).toBe(expected);
  });

  it('should match a search typed without its accents', () => {
    const poncage = posteFixture('Ponceuse', 'ponçage');

    expect(poncage.correspondA('poncage')).toBe(true);
    expect(poncage.correspondA('PONÇAGE')).toBe(true);
  });

  it('should suggest every workstation while the search is empty', () => {
    expect(posteFixture('Tour 1', 'tournage').correspondA('')).toBe(true);
  });
});
