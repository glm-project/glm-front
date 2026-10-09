import { FormulaireNature } from './FormulaireNature';
import { NatureDejaExistante } from './NatureDejaExistante';
import { NatureDeTravail } from './NatureDeTravail';
import { NatureDeTravailId } from './NatureDeTravailId';
import { NatureGeree } from './NatureGeree';

const soudageFixture = new NatureGeree(new NatureDeTravailId('nature-soudage'), new NatureDeTravail('Soudage'), {
  utilisee: true,
  postes: 2,
});
const naturesFixture = [soudageFixture];

describe('FormulaireNature', () => {
  it('should refuse an empty name', () => {
    expect(FormulaireNature.vide().decider(naturesFixture)).toEqual({
      type: 'invalide',
      erreur: 'La nature est obligatoire et limitée à 50 caractères.',
    });
  });

  it('should refuse a name longer than fifty characters', () => {
    expect(FormulaireNature.vide().avecSaisie('a'.repeat(51)).decider(naturesFixture).type).toBe('invalide');
  });

  it('should refuse the name of an existing nature, whatever its case and accents', () => {
    expect(FormulaireNature.vide().avecSaisie('SOUDÂGE').decider(naturesFixture)).toEqual({
      type: 'invalide',
      erreur: "« Soudage » existe déjà : choisissez-la plutôt que d'en créer une autre.",
    });
  });

  it('should start a renaming from the current name', () => {
    expect(FormulaireNature.pour(new NatureDeTravail('Soudage')).saisie).toBe('Soudage');
  });

  it('should let a nature keep its own name when renamed', () => {
    const decision = FormulaireNature.vide().avecSaisie('SOUDAGE').decider(naturesFixture, soudageFixture.id);

    expect(decision).toEqual({ type: 'prete', libelle: new NatureDeTravail('SOUDAGE') });
  });

  it('should warn about a close name before saving it', () => {
    expect(FormulaireNature.vide().avecSaisie('Soudure').decider(naturesFixture)).toEqual({ type: 'ressemblante', proche: soudageFixture });
  });

  it('should save a close name once the warning is accepted', () => {
    const formulaire = FormulaireNature.vide().avecSaisie('Soudure').accepterRessemblance();

    expect(formulaire.decider(naturesFixture)).toEqual({ type: 'prete', libelle: new NatureDeTravail('Soudure') });
  });

  it('should warn again once the name changes after the warning was accepted', () => {
    const formulaire = FormulaireNature.vide().avecSaisie('Soudure').accepterRessemblance().avecSaisie('Soudeur');

    expect(formulaire.decider(naturesFixture).type).toBe('ressemblante');
  });

  it('should keep the server refusal until the name changes', () => {
    const refusee = FormulaireNature.vide().avecSaisie('Rectification').avecRefus(new NatureDejaExistante());

    expect(refusee.decider(naturesFixture)).toEqual({ type: 'invalide', erreur: new NatureDejaExistante().message });
    expect(refusee.avecSaisie('Rectifieuse').decider(naturesFixture).type).toBe('prete');
  });
});
