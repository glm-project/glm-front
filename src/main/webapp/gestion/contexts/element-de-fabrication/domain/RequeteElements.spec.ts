import { RequeteElements } from './RequeteElements';

describe('RequeteElements', () => {
  it('should refuse negative page', () => {
    expect(() => new RequeteElements(-1, 20)).toThrow('Le numéro de page doit être un entier positif ou nul.');
  });

  it('should refuse a fractional page', () => {
    expect(() => new RequeteElements(1.5, 20)).toThrow('Le numéro de page doit être un entier positif ou nul.');
  });

  it('should refuse nonpositive size', () => {
    expect(() => new RequeteElements(0, 0)).toThrow('La taille de page doit être un entier strictement positif.');
    expect(() => new RequeteElements(0, -5)).toThrow('La taille de page doit être un entier strictement positif.');
  });

  it('should refuse a fractional size', () => {
    expect(() => new RequeteElements(0, 2.5)).toThrow('La taille de page doit être un entier strictement positif.');
  });
});
