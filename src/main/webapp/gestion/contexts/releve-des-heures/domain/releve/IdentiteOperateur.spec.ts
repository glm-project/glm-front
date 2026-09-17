import { IdentiteOperateur } from './IdentiteOperateur';

describe('IdentiteOperateur', () => {
  it('should carry the name and first name the report resolved', () => {
    const identite = new IdentiteOperateur('Dupont', 'Jean');

    expect(identite).toMatchObject({ nom: 'Dupont', prenom: 'Jean' });
  });

  it.each([
    ['', 'Jean'],
    ['Dupont', ''],
    ['   ', 'Jean'],
    ['Dupont', '   '],
  ])('should refuse the incomplete identity %s %s', (nom, prenom) => {
    expect(() => new IdentiteOperateur(nom, prenom)).toThrow('L’opérateur reçu du serveur n’a pas d’identité complète.');
  });
});
