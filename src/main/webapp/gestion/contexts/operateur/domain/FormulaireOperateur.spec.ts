import { FormulaireOperateur } from './FormulaireOperateur';
import { Identifiant } from './Identifiant';
import { IdentifiantDejaUtilise } from './IdentifiantDejaUtilise';
import { IdentiteDejaUtilisee } from './IdentiteDejaUtilisee';
import { NomOperateur } from './NomOperateur';
import { Operateur } from './Operateur';
import { OperateurId } from './OperateurId';
import { OperateurIntrouvable } from './OperateurIntrouvable';
import { PosteHabilitable } from './PosteHabilitable';
import { PosteHabilitableId } from './PosteHabilitableId';
import { PosteHabilitableIntrouvable } from './PosteHabilitableIntrouvable';
import { PrenomOperateur } from './PrenomOperateur';
import { TauxHoraire } from './TauxHoraire';

const tourFixture = new PosteHabilitable(new PosteHabilitableId('tour-1'), { libelle: 'Tour 1', nature: 'tournage' });
const scieFixture = new PosteHabilitable(new PosteHabilitableId('scie-1'), { libelle: 'Scie 1', nature: 'sciage' });

const operateurFixture = new Operateur(new OperateurId('jean'), {
  nom: new NomOperateur('Dupont'),
  prenom: new PrenomOperateur('Jean'),
  identifiant: new Identifiant('049'),
  tauxHoraire: new TauxHoraire(22),
  postes: [tourFixture],
  natures: ['tournage'],
});

const formulaireValideFixture = (): FormulaireOperateur => FormulaireOperateur.pourCreation().avecNom('Dupont').avecPrenom('Jean');

describe('FormulaireOperateur', () => {
  it('should start a declaration empty and refuse to produce a command', () => {
    const formulaire = FormulaireOperateur.pourCreation();

    expect(formulaire.saisie).toEqual({ nom: '', prenom: '', identifiant: '', tauxHoraire: '', postes: [] });
    expect(formulaire.estValide()).toBe(false);
    expect(formulaire.produireCommande()).toEqual({
      ok: false,
      error: {
        nom: 'Le nom est obligatoire et limité à 100 caractères.',
        prenom: 'Le prénom est obligatoire et limité à 100 caractères.',
        identifiant: undefined,
        tauxHoraire: undefined,
        enregistrement: undefined,
      },
    });
  });

  it('should restate an existing operator for revision', () => {
    const formulaire = FormulaireOperateur.pourModification(operateurFixture);

    expect(formulaire.saisie).toEqual({ nom: 'Dupont', prenom: 'Jean', identifiant: '049', tauxHoraire: '22', postes: [tourFixture] });
    expect(formulaire.id).toBe(operateurFixture.id);
  });

  it('should restate an operator without payroll number nor hourly rate as empty entries', () => {
    const sansOptions = new Operateur(new OperateurId('lea'), {
      nom: new NomOperateur('Martin'),
      prenom: new PrenomOperateur('Léa'),
      identifiant: undefined,
      tauxHoraire: undefined,
      postes: [],
      natures: [],
    });

    const formulaire = FormulaireOperateur.pourModification(sansOptions);

    expect(formulaire.saisie.identifiant).toBe('');
    expect(formulaire.saisie.tauxHoraire).toBe('');
  });

  it('should produce a creation command carrying the optional entries', () => {
    const formulaire = formulaireValideFixture().avecIdentifiant('049').avecTauxHoraire('22,5').avecPosteAjoute(tourFixture);

    expect(formulaire.produireCommande()).toEqual({
      ok: true,
      value: {
        type: 'CREATION',
        nom: new NomOperateur('Dupont'),
        prenom: new PrenomOperateur('Jean'),
        identifiant: new Identifiant('049'),
        tauxHoraire: new TauxHoraire(22.5),
        postes: [tourFixture.id],
      },
    });
  });

  it('should produce a creation command dropping the blank optional entries', () => {
    const formulaire = formulaireValideFixture().avecIdentifiant('  ').avecTauxHoraire('  ');

    expect(formulaire.produireCommande()).toEqual({
      ok: true,
      value: {
        type: 'CREATION',
        nom: new NomOperateur('Dupont'),
        prenom: new PrenomOperateur('Jean'),
        identifiant: undefined,
        tauxHoraire: undefined,
        postes: [],
      },
    });
  });

  it('should produce a revision command bearing the operator identifier', () => {
    const formulaire = FormulaireOperateur.pourModification(operateurFixture).avecNom('Durand');

    expect(formulaire.produireCommande()).toEqual({
      ok: true,
      value: {
        type: 'MODIFICATION',
        id: operateurFixture.id,
        nom: new NomOperateur('Durand'),
        prenom: new PrenomOperateur('Jean'),
        identifiant: new Identifiant('049'),
        tauxHoraire: new TauxHoraire(22),
        postes: [tourFixture.id],
      },
    });
  });

  it('should keep the habilitations ordered by label as they are granted', () => {
    const formulaire = formulaireValideFixture().avecPosteAjoute(tourFixture).avecPosteAjoute(scieFixture);

    expect(formulaire.saisie.postes.map(poste => poste.libelle)).toEqual(['Scie 1', 'Tour 1']);
  });

  it('should ignore a habilitation that is already granted', () => {
    const formulaire = formulaireValideFixture().avecPosteAjoute(tourFixture);

    const inchange = formulaire.avecPosteAjoute(tourFixture);

    expect(inchange).toBe(formulaire);
    expect(inchange.estDejaHabilite(tourFixture.id)).toBe(true);
  });

  it('should withdraw only the designated habilitation', () => {
    const formulaire = formulaireValideFixture().avecPosteAjoute(tourFixture).avecPosteAjoute(scieFixture).avecPosteRetire(tourFixture.id);

    expect(formulaire.saisie.postes).toEqual([scieFixture]);
    expect(formulaire.estDejaHabilite(tourFixture.id)).toBe(false);
  });

  it.each([
    ['avecNom', (formulaire: FormulaireOperateur): FormulaireOperateur => formulaire.avecNom('Durand')],
    ['avecPrenom', (formulaire: FormulaireOperateur): FormulaireOperateur => formulaire.avecPrenom('Jeanne')],
  ])('should clear a duplicate identity refusal once %s changes the entry', (_transition, change) => {
    const refuse = formulaireValideFixture().avecRefus(new IdentiteDejaUtilisee());

    const corrige = change(refuse);

    expect(refuse.erreurNom()).toBe('Un autre opérateur porte déjà ce nom et ce prénom.');
    expect(corrige.erreurNom()).toBeUndefined();
  });

  it.each([
    ['avecNom', (formulaire: FormulaireOperateur): FormulaireOperateur => formulaire.avecNom('Dupont')],
    ['avecPrenom', (formulaire: FormulaireOperateur): FormulaireOperateur => formulaire.avecPrenom('Jean')],
  ])('should keep a duplicate identity refusal while %s retypes the same entry', (_transition, retype) => {
    const refuse = retype(formulaireValideFixture().avecRefus(new IdentiteDejaUtilisee()));

    expect(refuse.erreurNom()).toBe('Un autre opérateur porte déjà ce nom et ce prénom.');
  });

  it('should keep a duplicate payroll number refusal while the payroll number is retyped identically', () => {
    const refuse = formulaireValideFixture().avecIdentifiant('049').avecRefus(new IdentifiantDejaUtilise()).avecIdentifiant('049');

    expect(refuse.erreurIdentifiant()).toBe('Un autre opérateur porte déjà cet identifiant.');
  });

  it('should keep a duplicate payroll number refusal when another entry changes', () => {
    const refuse = formulaireValideFixture().avecIdentifiant('049').avecRefus(new IdentifiantDejaUtilise()).avecNom('Durand');

    expect(refuse.erreurIdentifiant()).toBe('Un autre opérateur porte déjà cet identifiant.');
  });

  it.each([
    ['a duplicate identity', new IdentiteDejaUtilisee()],
    ['a duplicate payroll number', new IdentifiantDejaUtilise()],
  ])('should not report %s as a saving failure', (_refus, refus) => {
    const refuse = formulaireValideFixture().avecIdentifiant('049').avecRefus(refus);

    expect(refuse.erreurEnregistrement()).toBeUndefined();
  });

  it('should clear a duplicate payroll number refusal once the payroll number changes', () => {
    const refuse = formulaireValideFixture().avecIdentifiant('049').avecRefus(new IdentifiantDejaUtilise());

    const corrige = refuse.avecIdentifiant('050');

    expect(refuse.erreurIdentifiant()).toBe('Un autre opérateur porte déjà cet identifiant.');
    expect(corrige.erreurIdentifiant()).toBeUndefined();
  });

  it('should keep a duplicate payroll number refusal while another entry changes', () => {
    const refuse = formulaireValideFixture().avecIdentifiant('049').avecRefus(new IdentifiantDejaUtilise()).avecTauxHoraire('22');

    expect(refuse.erreurIdentifiant()).toBe('Un autre opérateur porte déjà cet identifiant.');
  });

  it.each([
    ['granting', (formulaire: FormulaireOperateur): FormulaireOperateur => formulaire.avecPosteAjoute(scieFixture)],
    ['withdrawing', (formulaire: FormulaireOperateur): FormulaireOperateur => formulaire.avecPosteRetire(tourFixture.id)],
  ])('should clear an unknown workstation refusal once %s a habilitation', (_transition, change) => {
    const refuse = formulaireValideFixture().avecPosteAjoute(tourFixture).avecRefus(new PosteHabilitableIntrouvable());

    const corrige = change(refuse);

    expect(refuse.erreurEnregistrement()).toBe('Un des postes habilités n’existe plus. Actualisez la liste des opérateurs.');
    expect(corrige.erreurEnregistrement()).toBeUndefined();
  });

  it('should keep an unknown workstation refusal when withdrawing an absent habilitation', () => {
    const refuse = formulaireValideFixture().avecRefus(new PosteHabilitableIntrouvable()).avecPosteRetire(tourFixture.id);

    expect(refuse.erreurEnregistrement()).toBe('Un des postes habilités n’existe plus. Actualisez la liste des opérateurs.');
  });

  it('should report a vanished operator as a saving failure', () => {
    const refuse = formulaireValideFixture().avecRefus(new OperateurIntrouvable());

    expect(refuse.erreurEnregistrement()).toBe('Cet opérateur n’existe plus. Actualisez la liste des opérateurs.');
    expect(refuse.estValide()).toBe(false);
  });

  it.each(['1234567', '12A'])('should report an identifier that is not one to six digits: %s', identifiant => {
    const formulaire = formulaireValideFixture().avecIdentifiant(identifiant);

    expect(formulaire.erreurIdentifiant()).toBe("L'identifiant contient de 1 à 6 chiffres.");
    expect(formulaire.estValide()).toBe(false);
  });

  it.each(['0', '-1', 'abc'])('should report an hourly rate that is not strictly positive: %s', taux => {
    const formulaire = formulaireValideFixture().avecTauxHoraire(taux);

    expect(formulaire.erreurTauxHoraire()).toBe('Le taux horaire doit être un nombre strictement positif.');
  });

  it('should report a missing first name', () => {
    const formulaire = FormulaireOperateur.pourCreation().avecNom('Dupont');

    expect(formulaire.erreurPrenom()).toBe('Le prénom est obligatoire et limité à 100 caractères.');
  });
});
