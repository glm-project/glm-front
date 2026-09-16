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
    ['tou', true],
    ['  TOUR  ', true],
    ['tournage', true],
    ['TOURNAGE', true],
    ['soudage', false],
  ])('should match the search term %s on label or trade: %s', (recherche, expected) => {
    expect(posteFixture('Tour 1', 'tournage').correspondA(recherche)).toBe(expected);
  });
});
