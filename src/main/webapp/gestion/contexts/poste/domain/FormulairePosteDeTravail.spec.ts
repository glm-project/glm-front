import { CoutHoraire } from './CoutHoraire';
import { FormulairePosteDeTravail } from './FormulairePosteDeTravail';
import { LibellePoste } from './LibellePoste';
import { LibellePosteDejaUtilise } from './LibellePosteDejaUtilise';
import { NatureDeTravail } from './NatureDeTravail';
import { PosteDeTravail } from './PosteDeTravail';
import { PosteDeTravailId } from './PosteDeTravailId';
import { PosteIntrouvable } from './PosteIntrouvable';

describe('FormulairePosteDeTravail', () => {
  it.each([
    [undefined, ''],
    [new CoutHoraire(45.5), '45.5'],
  ] as const)('should initialize editing from the workstation with cost %s', (coutHoraire, saisie) => {
    const poste = new PosteDeTravail(new PosteDeTravailId('tour-1'), {
      libelle: new LibellePoste('Tour 1'),
      nature: new NatureDeTravail('tournage'),
      coutHoraire,
    });
    const formulaire = FormulairePosteDeTravail.pourModification(poste);

    expect(formulaire.saisie).toEqual({ libelle: 'Tour 1', nature: 'tournage', coutHoraire: saisie });
    expect(formulaire.id?.value).toBe('tour-1');
    expect(formulaire.estValide()).toBe(true);
  });

  it('should produce a modification command containing the target workstation identity', () => {
    const poste = new PosteDeTravail(new PosteDeTravailId('tour-1'), {
      libelle: new LibellePoste('Tour 1'),
      nature: new NatureDeTravail('tournage'),
      coutHoraire: undefined,
    });
    const formulaire = FormulairePosteDeTravail.pourModification(poste);
    const commande = formulaire.produireCommande();

    expect(commande).toEqual({
      ok: true,
      value: {
        id: { value: 'tour-1' },
        libelle: { value: 'Tour 1' },
        nature: { value: 'tournage' },
        coutHoraire: undefined,
      },
    });
  });

  it('should preserve object identity on redundant transitions', () => {
    const initial = FormulairePosteDeTravail.pourCreation().avecLibelle('Tour 1').avecNature('tournage').avecCoutHoraire('45');

    expect(initial.avecLibelle('Tour 1')).toBe(initial);
    expect(initial.avecNature('tournage')).toBe(initial);
    expect(initial.avecCoutHoraire('45')).toBe(initial);
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

  it.each(['avecNature', 'avecCoutHoraire', 'avecLibelle'] as const)(
    'should retain the duplicate refusal when %s leaves the rejected label unchanged',
    transition => {
      const refuse = formulaireValideFixture().avecRefus(new LibellePosteDejaUtilise());
      const formulaire = refuse[transition]('Tour 1');

      expect(formulaire.erreurLibelle()).toBe('Un autre poste porte déjà ce libellé.');
    },
  );

  it('should retain a missing workstation refusal through subsequent entry changes', () => {
    const formulaire = formulaireValideFixture()
      .avecRefus(new PosteIntrouvable())
      .avecLibelle('Tour 2')
      .avecNature('soudage')
      .avecCoutHoraire('50');
    const commande = formulaire.produireCommande();

    expect(formulaire.erreurLibelle()).toBeUndefined();
    expect(formulaire.erreurEnregistrement()).toBe('Ce poste n’existe plus. Actualisez la liste des postes.');
    expect(formulaire.erreurPosteIntrouvable()).toBe('Ce poste n’existe plus. Actualisez la liste des postes.');
    expect(commande.ok).toBe(false);
  });

  it.each([
    ['', undefined],
    ['  ', undefined],
    ['45.5', 45.5],
    ['45,5', 45.5],
  ])('should produce a validated creation command from entries with hourly cost %s', (cout, attendu) => {
    const initial = FormulairePosteDeTravail.pourCreation();
    const formulaire = initial.avecLibelle('  Tour 1 ').avecNature(' tournage ').avecCoutHoraire(cout);
    const commande = formulaire.produireCommande();

    expect(initial.saisie).toEqual({ libelle: '', nature: '', coutHoraire: '' });
    expect(formulaire.estValide()).toBe(true);
    expect(commande).toEqual({
      ok: true,
      value: {
        libelle: { value: 'Tour 1' },
        nature: { value: 'tournage' },
        coutHoraire: attendu === undefined ? undefined : { value: attendu },
      },
    });
  });

  it.each(['0', '-0.01', 'abc', 'Infinity', '1e999'])('should report an invalid hourly cost without producing a command: %s', cout => {
    const formulaire = FormulairePosteDeTravail.pourCreation().avecLibelle('Tour 1').avecNature('tournage').avecCoutHoraire(cout);
    const commande = formulaire.produireCommande();

    expect(formulaire.estValide()).toBe(false);
    expect(formulaire.erreurLibelle()).toBeUndefined();
    expect(formulaire.erreurNature()).toBeUndefined();
    expect(formulaire.erreurCoutHoraire()).toBe('Le coût horaire doit être un nombre strictement positif.');
    expect(commande.ok).toBe(false);
  });

  it.each([
    ['', 'tournage'],
    ['a'.repeat(101), 'tournage'],
    ['Tour 1', ''],
    ['Tour 1', 'a'.repeat(51)],
  ])('should refuse an invalid label or nature (%s, %s)', (libelle, nature) => {
    const formulaire = FormulairePosteDeTravail.pourCreation().avecLibelle(libelle).avecNature(nature);
    const commande = formulaire.produireCommande();

    expect(formulaire.estValide()).toBe(false);
    expect(commande.ok).toBe(false);
  });

  it('should start creation with empty entries and refuse an incomplete command', () => {
    const formulaire = FormulairePosteDeTravail.pourCreation();
    const commande = formulaire.produireCommande();

    expect(formulaire.saisie).toEqual({ libelle: '', nature: '', coutHoraire: '' });
    expect(formulaire.estValide()).toBe(false);
    expect(commande).toEqual({
      ok: false,
      error: {
        libelle: 'Le libellé est obligatoire et limité à 100 caractères.',
        nature: 'La nature est obligatoire et limitée à 50 caractères.',
        coutHoraire: undefined,
        enregistrement: undefined,
      },
    });
  });
});

const formulaireValideFixture = (): FormulairePosteDeTravail =>
  FormulairePosteDeTravail.pourCreation().avecLibelle('Tour 1').avecNature('tournage');
