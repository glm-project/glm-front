import { ElementDeFabrication } from './ElementDeFabrication';
import { ElementDeFabricationId } from './ElementDeFabricationId';
import { ElementDeFabricationIntrouvable } from './ElementDeFabricationIntrouvable';
import { FormulaireElementDeFabrication } from './FormulaireElementDeFabrication';
import { LibelleDElement } from './LibelleDElement';
import { NomDElement } from './NomDElement';
import { ReferenceDElement } from './ReferenceDElement';
import { ReferenceDejaUtilisee } from './ReferenceDejaUtilisee';
import { TypeDElementDeFabrication } from './TypeDElementDeFabrication';

describe('FormulaireElementDeFabrication', () => {
  it.each(['PRODUIT', 'ORDRE_DE_FABRICATION'] as const)('should create a %s reduced to its produced number', type => {
    const formulaire = FormulaireElementDeFabrication.pourCreation(type);

    expect(formulaire.estValide()).toBe(true);
    expect(formulaire.produireCommande()).toEqual({
      ok: true,
      value: { kind: 'CREATION', type, reference: undefined, libelle: undefined },
    });
  });

  it('should carry the entered company number and label into the creation command', () => {
    const formulaire = FormulaireElementDeFabrication.pourCreation('PRODUIT').avecReference('1015').avecLibelle('Moule de capot');

    expect(formulaire.produireCommande()).toEqual({
      ok: true,
      value: { kind: 'CREATION', type: 'PRODUIT', reference: { value: '1015' }, libelle: { value: 'Moule de capot' } },
    });
  });

  it.each([
    ['blank entries', '   ', '   '],
    ['empty entries', '', ''],
  ])('should treat %s as an element without company number nor label', (_scenario, reference, libelle) => {
    const formulaire = FormulaireElementDeFabrication.pourCreation('PRODUIT').avecReference(reference).avecLibelle(libelle);

    expect(formulaire.produireCommande()).toEqual({
      ok: true,
      value: { kind: 'CREATION', type: 'PRODUIT', reference: undefined, libelle: undefined },
    });
  });

  it('should initialize editing from the element and keep its type', () => {
    const formulaire = FormulaireElementDeFabrication.pourModification(elementFixture('1015', 'Moule de capot'));

    expect(formulaire.type).toBe('PRODUIT');
    expect(formulaire.saisie).toEqual({ reference: '1015', libelle: 'Moule de capot' });
    expect(formulaire.produireCommande()).toEqual({
      ok: true,
      value: { kind: 'MODIFICATION', id: { value: 'moule-1' }, reference: { value: '1015' }, libelle: { value: 'Moule de capot' } },
    });
  });

  it('should start editing an element that has neither company number nor label with empty entries', () => {
    const formulaire = FormulaireElementDeFabrication.pourModification(elementFixture(undefined, undefined));

    expect(formulaire.saisie).toEqual({ reference: '', libelle: '' });
  });

  it('should remove the company number and the label of an existing element', () => {
    const formulaire = FormulaireElementDeFabrication.pourModification(elementFixture('1015', 'Moule de capot'))
      .avecReference('')
      .avecLibelle('');

    expect(formulaire.produireCommande()).toEqual({
      ok: true,
      value: { kind: 'MODIFICATION', id: { value: 'moule-1' }, reference: undefined, libelle: undefined },
    });
  });

  it('should refuse an oversized company number without producing a command', () => {
    const formulaire = FormulaireElementDeFabrication.pourCreation('PRODUIT').avecReference('a'.repeat(101));

    expect(formulaire.estValide()).toBe(false);
    expect(formulaire.erreurReference()).toBe('La référence est limitée à 100 caractères.');
    expect(formulaire.produireCommande()).toEqual({
      ok: false,
      error: { reference: 'La référence est limitée à 100 caractères.', libelle: undefined, enregistrement: undefined },
    });
  });

  it('should refuse a label beyond one line without producing a command', () => {
    const formulaire = FormulaireElementDeFabrication.pourCreation('PRODUIT').avecLibelle('a'.repeat(101));

    expect(formulaire.estValide()).toBe(false);
    expect(formulaire.erreurLibelle()).toBe('Le libellé tient sur une ligne : 100 caractères au plus.');
    expect(formulaire.produireCommande().ok).toBe(false);
  });

  it('should attach the duplicate refusal to the company number and prevent resubmission', () => {
    const initial = FormulaireElementDeFabrication.pourCreation('PRODUIT').avecReference('1015');
    const formulaire = initial.avecRefus(new ReferenceDejaUtilisee());

    expect(initial.estValide()).toBe(true);
    expect(formulaire.erreurReference()).toBe('Un autre moule ou OF porte déjà cette référence.');
    expect(formulaire.produireCommande().ok).toBe(false);
  });

  it('should clear the duplicate refusal after changing the company number', () => {
    const refuse = FormulaireElementDeFabrication.pourCreation('PRODUIT').avecReference('1015').avecRefus(new ReferenceDejaUtilisee());
    const corrige = refuse.avecReference('1016');

    expect(corrige.erreurReference()).toBeUndefined();
    expect(corrige.estValide()).toBe(true);
    expect(refuse.erreurReference()).toBe('Un autre moule ou OF porte déjà cette référence.');
  });

  it('should keep the duplicate refusal while the label alone is edited', () => {
    const refuse = FormulaireElementDeFabrication.pourCreation('PRODUIT').avecReference('1015').avecRefus(new ReferenceDejaUtilisee());
    const modifie = refuse.avecLibelle('Moule de capot');

    expect(modifie.erreurReference()).toBe('Un autre moule ou OF porte déjà cette référence.');
  });

  it('should keep the duplicate refusal when the company number is retyped identically', () => {
    const refuse = FormulaireElementDeFabrication.pourCreation('PRODUIT').avecReference('1015').avecRefus(new ReferenceDejaUtilisee());
    const inchange = refuse.avecReference('1015');

    expect(inchange.erreurReference()).toBe('Un autre moule ou OF porte déjà cette référence.');
  });

  it('should report a vanished element on the saving line rather than on a field', () => {
    const formulaire = FormulaireElementDeFabrication.pourModification(elementFixture('1015', undefined)).avecRefus(
      new ElementDeFabricationIntrouvable(),
    );

    expect(formulaire.erreurEnregistrement()).toBe('Cet élément n’existe plus. Actualisez la liste.');
    expect(formulaire.erreurReference()).toBeUndefined();
    expect(formulaire.produireCommande().ok).toBe(false);
  });

  it('should keep a vanished element refusal while the company number is corrected', () => {
    const refuse = FormulaireElementDeFabrication.pourModification(elementFixture('1015', undefined)).avecRefus(
      new ElementDeFabricationIntrouvable(),
    );
    const corrige = refuse.avecReference('1016');

    expect(corrige.erreurEnregistrement()).toBe('Cet élément n’existe plus. Actualisez la liste.');
  });

  const elementFixture = (
    reference: string | undefined,
    libelle: string | undefined,
    type: TypeDElementDeFabrication = 'PRODUIT',
  ): ElementDeFabrication =>
    new ElementDeFabrication(new ElementDeFabricationId('moule-1'), {
      type,
      nom: new NomDElement('PRD-2026-000001'),
      reference: reference === undefined ? undefined : new ReferenceDElement(reference),
      libelle: libelle === undefined ? undefined : new LibelleDElement(libelle),
    });
});
