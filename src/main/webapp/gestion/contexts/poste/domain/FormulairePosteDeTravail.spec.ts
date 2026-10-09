import { CoutHoraire } from './CoutHoraire';
import { FormulairePosteDeTravail } from './FormulairePosteDeTravail';
import { LibellePoste } from './LibellePoste';
import { LibellePosteDejaUtilise } from './LibellePosteDejaUtilise';
import { NatureDeTravail } from './NatureDeTravail';
import { NatureDeTravailId } from './NatureDeTravailId';
import { NatureInconnue } from './NatureInconnue';
import { PosteDeTravail } from './PosteDeTravail';
import { PosteDeTravailId } from './PosteDeTravailId';
import { PosteIntrouvable } from './PosteIntrouvable';

describe('FormulairePosteDeTravail', () => {
  it.each([
    [undefined, undefined],
    [new CoutHoraire(45.5), 45.5],
  ] as const)('should initialize editing from the workstation with cost %s', (coutHoraire, attendu) => {
    const poste = new PosteDeTravail(new PosteDeTravailId('tour-1'), {
      libelle: new LibellePoste('Tour 1'),
      nature: new NatureDeTravail('tournage'),
      natureId: new NatureDeTravailId('nature-tournage'),
      coutHoraire,
    });
    const formulaire = FormulairePosteDeTravail.pourModification(poste);

    expect(formulaire.id?.value).toBe('tour-1');
    expect(formulaire.estValide()).toBe(true);
    expect(formulaire.produireCommande()).toEqual({
      ok: true,
      value: {
        type: 'MODIFICATION',
        id: { value: 'tour-1' },
        libelle: { value: 'Tour 1' },
        nature: { value: 'tournage' },
        natureId: { value: 'nature-tournage' },
        coutHoraire: attendu === undefined ? undefined : { value: attendu },
      },
    });
  });

  it('should attach the duplicate refusal to the label and prevent resubmission', () => {
    const initial = formulaireValideFixture();
    const formulaire = initial.avecRefus(new LibellePosteDejaUtilise());

    expect(initial.estValide()).toBe(true);
    expect(formulaire.erreurLibelle()).toBe('Un autre poste porte déjà ce libellé.');
    expect(formulaire.produireCommande().ok).toBe(false);
  });

  it('should clear the duplicate refusal after changing the label', () => {
    const refuse = formulaireValideFixture().avecRefus(new LibellePosteDejaUtilise());
    const corrige = refuse.avecLibelle('Tour 2');

    expect(corrige.erreurLibelle()).toBeUndefined();
    expect(corrige.estValide()).toBe(true);
    expect(refuse.erreurLibelle()).toBe('Un autre poste porte déjà ce libellé.');
  });

  it('should keep validation when a duplicate label is replaced with a blank label', () => {
    const refuse = formulaireValideFixture().avecRefus(new LibellePosteDejaUtilise());
    const corrige = refuse.avecLibelle('');

    expect(corrige.erreurLibelle()).toBe('Le libellé est obligatoire et limité à 100 caractères.');
  });

  it('should retain the duplicate refusal when editing the nature or the hourly cost', () => {
    const refuse = formulaireValideFixture().avecRefus(new LibellePosteDejaUtilise());

    expect(refuse.avecNature('usinage').erreurLibelle()).toBe('Un autre poste porte déjà ce libellé.');
    expect(refuse.avecCoutHoraire('50').erreurLibelle()).toBe('Un autre poste porte déjà ce libellé.');
  });

  it('should retain the duplicate refusal when the label is unchanged', () => {
    const refuse = formulaireValideFixture().avecRefus(new LibellePosteDejaUtilise());

    expect(refuse.avecLibelle('Tour 1').erreurLibelle()).toBe('Un autre poste porte déjà ce libellé.');
  });

  it('should retain a missing workstation refusal through subsequent entry changes', () => {
    const formulaire = formulaireValideFixture()
      .avecRefus(new PosteIntrouvable())
      .avecLibelle('Tour 2')
      .avecNature('soudage')
      .avecCoutHoraire('50');
    const commande = formulaire.produireCommande();

    expect(formulaire.erreurLibelle()).toBeUndefined();
    expect(formulaire.erreurEnregistrement()).toBe('Ce poste n’existe plus. Actualisez la liste des postes.');
    expect(commande.ok).toBe(false);
  });

  it.each([
    ['', undefined],
    ['  ', undefined],
    ['45.5', 45.5],
    ['45,5', 45.5],
  ])('should produce a validated creation command from entries with hourly cost %s', (cout, attendu) => {
    const initial = FormulairePosteDeTravail.pourCreation();
    const formulaire = initial.avecLibelle('  Tour 1 ').choisirNature(tournageFixture).avecCoutHoraire(cout);
    const commande = formulaire.produireCommande();

    expect(formulaire.estValide()).toBe(true);
    expect(commande).toEqual({
      ok: true,
      value: {
        type: 'CREATION',
        libelle: { value: 'Tour 1' },
        nature: { value: 'tournage' },
        natureId: { value: 'nature-tournage' },
        coutHoraire: attendu === undefined ? undefined : { value: attendu },
      },
    });
  });

  it.each(['0', '-0.01', 'abc', 'Infinity', '1e999'])('should report an invalid hourly cost without producing a command: %s', cout => {
    const formulaire = FormulairePosteDeTravail.pourCreation().avecLibelle('Tour 1').choisirNature(tournageFixture).avecCoutHoraire(cout);
    const commande = formulaire.produireCommande();

    expect(formulaire.estValide()).toBe(false);
    expect(formulaire.erreurLibelle()).toBeUndefined();
    expect(formulaire.erreurNature()).toBeUndefined();
    expect(formulaire.erreurCoutHoraire()).toBe('Le coût horaire doit être un nombre strictement positif.');
    expect(commande.ok).toBe(false);
  });

  it.each(['', 'a'.repeat(101)])('should refuse an invalid label %j', libelle => {
    const formulaire = FormulairePosteDeTravail.pourCreation().avecLibelle(libelle).choisirNature(tournageFixture);

    expect(formulaire.estValide()).toBe(false);
    expect(formulaire.produireCommande().ok).toBe(false);
  });

  it('should refuse a nature typed without choosing it from the list', () => {
    const formulaire = FormulairePosteDeTravail.pourCreation().avecLibelle('Tour 1').avecNature('tournage');

    expect(formulaire.erreurNature()).toBe('Choisissez une nature dans la liste.');
    expect(formulaire.produireCommande().ok).toBe(false);
  });

  it('should forget the chosen nature once its name is edited', () => {
    const formulaire = formulaireValideFixture().avecNature('tournag');

    expect(formulaire.erreurNature()).toBe('Choisissez une nature dans la liste.');
  });

  it('should keep the chosen nature while its name is unchanged', () => {
    const formulaire = formulaireValideFixture().avecNature('tournage');

    expect(formulaire.erreurNature()).toBeUndefined();
  });

  it('should explain on the nature that it disappeared meanwhile', () => {
    const formulaire = formulaireValideFixture().avecRefus(new NatureInconnue());

    expect(formulaire.erreurNature()).toBe("Cette nature n'existe plus : choisissez-en une autre dans la liste.");
    expect(formulaire.produireCommande().ok).toBe(false);
  });

  it('should forget the disappeared nature once another one is chosen', () => {
    const soudage = { id: new NatureDeTravailId('nature-soudage'), libelle: new NatureDeTravail('soudage') };

    const formulaire = formulaireValideFixture().avecRefus(new NatureInconnue()).choisirNature(soudage);

    expect(formulaire.erreurNature()).toBeUndefined();
    expect(formulaire.estValide()).toBe(true);
  });

  it('should keep a duplicate label refusal when choosing another nature', () => {
    const formulaire = formulaireValideFixture().avecRefus(new LibellePosteDejaUtilise()).choisirNature(tournageFixture);

    expect(formulaire.erreurLibelle()).toBe('Un autre poste porte déjà ce libellé.');
  });

  it('should start a creation on the nature given by the page', () => {
    const formulaire = FormulairePosteDeTravail.pourCreation(tournageFixture).avecLibelle('Tour 1');

    expect(formulaire.saisie.nature).toBe('tournage');
    expect(formulaire.estValide()).toBe(true);
  });

  it('should start creation with empty entries and refuse an incomplete command', () => {
    const formulaire = FormulairePosteDeTravail.pourCreation();
    const commande = formulaire.produireCommande();

    expect(formulaire.estValide()).toBe(false);
    expect(commande).toEqual({
      ok: false,
      error: {
        libelle: 'Le libellé est obligatoire et limité à 100 caractères.',
        nature: 'Choisissez une nature dans la liste.',
        coutHoraire: undefined,
        enregistrement: undefined,
      },
    });
  });
});

const tournageFixture = { id: new NatureDeTravailId('nature-tournage'), libelle: new NatureDeTravail('tournage') };

const formulaireValideFixture = (): FormulairePosteDeTravail =>
  FormulairePosteDeTravail.pourCreation().avecLibelle('Tour 1').choisirNature(tournageFixture);
