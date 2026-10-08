import { CategorieDejaExistante } from './CategorieDejaExistante';
import { CategorieDeProduit } from './CategorieDeProduit';
import { FormulaireCategorieDeProduit } from './FormulaireCategorieDeProduit';

describe('FormulaireCategorieDeProduit', () => {
  it('should read the typed code in capital letters and keep the typing as entered', () => {
    const formulaire = FormulaireCategorieDeProduit.vide().avecCode('piece');

    expect([formulaire.code, formulaire.saisie]).toEqual(['PIECE', 'piece']);
  });

  it('should produce the declared category from a valid code', () => {
    const formulaire = FormulaireCategorieDeProduit.vide().avecCode('piece');

    expect(formulaire.produireCategorie()).toEqual({ ok: true, value: new CategorieDeProduit('PIECE') });
    expect(formulaire.erreurCode()).toBeUndefined();
  });

  it.each(['', 'pièce', 'moule of', 'abcdefghijk'])('should refuse to produce a category from %p', code => {
    const formulaire = FormulaireCategorieDeProduit.vide().avecCode(code);

    expect(formulaire.produireCategorie()).toEqual({
      ok: false,
      error: 'Le code tient en 1 à 10 lettres majuscules, sans accent ni espace.',
    });
  });

  it('should attach the duplicate refusal to the code and prevent resubmission', () => {
    const formulaire = FormulaireCategorieDeProduit.vide().avecCode('MOULE').avecRefus(new CategorieDejaExistante());

    expect(formulaire.erreurCode()).toBe('Cette catégorie existe déjà.');
    expect(formulaire.produireCategorie().ok).toBe(false);
  });

  it('should keep the duplicate refusal while the same code is typed again', () => {
    const formulaire = FormulaireCategorieDeProduit.vide().avecCode('MOULE').avecRefus(new CategorieDejaExistante()).avecCode('moule');

    expect(formulaire.erreurCode()).toBe('Cette catégorie existe déjà.');
  });

  it('should clear the duplicate refusal once the code changes', () => {
    const formulaire = FormulaireCategorieDeProduit.vide().avecCode('MOULE').avecRefus(new CategorieDejaExistante()).avecCode('MOULES');

    expect(formulaire.erreurCode()).toBeUndefined();
  });
});
