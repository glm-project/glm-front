import { memeNom, ressemble } from './RessemblanceDeNature';

describe('RessemblanceDeNature', () => {
  it.each([
    ['Soudage', 'SOUDÂGE'],
    ['Électro-érosion', '  electro-erosion '],
    ['Soudage TIG', 'soudage   tig'],
  ])('should read %s and %s as the same name', (gauche, droite) => {
    expect(memeNom(gauche, droite)).toBe(true);
  });

  it.each([
    ['Soudage', 'Soudure', 'they share their first four letters'],
    ['Fraisage', 'Fraizage', 'one letter differs'],
    ['Dessin', 'Desin', 'one letter is missing'],
  ])('should find %s close to %s because %s', (gauche, droite) => {
    expect(ressemble(gauche, droite)).toBe(true);
  });

  it.each([
    ['Soudage', 'Tournage'],
    ['Dessin', 'Peinture'],
    ['Soudage', 'soudâge'],
  ])('should not find %s close to %s', (gauche, droite) => {
    expect(ressemble(gauche, droite)).toBe(false);
  });
});
