import { RequetePostes } from './RequetePostes';

describe('RequetePostes', () => {
  it('should refuse negative page', () => {
    expect(() => new RequetePostes(-1, 20)).toThrow('Le numéro de page doit être un entier positif ou nul.');
  });

  it('should refuse nonpositive size', () => {
    expect(() => new RequetePostes(0, 0)).toThrow('La taille de page doit être un entier strictement positif.');
    expect(() => new RequetePostes(0, -5)).toThrow('La taille de page doit être un entier strictement positif.');
  });
});
