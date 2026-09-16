import { FormulaireOperateur } from './FormulaireOperateur';
import { IdentiteDejaUtilisee } from './IdentiteDejaUtilisee';
import { Matricule } from './Matricule';
import { MatriculeDejaUtilise } from './MatriculeDejaUtilise';
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
  matricule: new Matricule('049'),
  tauxHoraire: new TauxHoraire(22),
  postes: [tourFixture],
  natures: ['tournage'],
});

const formulaireValideFixture = (): FormulaireOperateur => FormulaireOperateur.pourCreation().avecNom('Dupont').avecPrenom('Jean');

describe('FormulaireOperateur', () => {
  it('should start a declaration empty and refuse to produce a command', () => {
    const formulaire = FormulaireOperateur.pourCreation();

    expect(formulaire.saisie).toEqual({ nom: '', prenom: '', matricule: '', tauxHoraire: '', postes: [] });
    expect(formulaire.estValide()).toBe(false);
    expect(formulaire.produireCommande()).toEqual({
      ok: false,
      error: {
        nom: 'Le nom est obligatoire et limité à 100 caractères.',
        prenom: 'Le prénom est obligatoire et limité à 100 caractères.',
        matricule: undefined,
        tauxHoraire: undefined,
        enregistrement: undefined,
      },
    });
  });

  it('should restate an existing operator for revision', () => {
    const formulaire = FormulaireOperateur.pourModification(operateurFixture);

    expect(formulaire.saisie).toEqual({ nom: 'Dupont', prenom: 'Jean', matricule: '049', tauxHoraire: '22', postes: [tourFixture] });
    expect(formulaire.id).toBe(operateurFixture.id);
  });

  it('should restate an operator without payroll number nor hourly rate as empty entries', () => {
    const sansOptions = new Operateur(new OperateurId('lea'), {
      nom: new NomOperateur('Martin'),
      prenom: new PrenomOperateur('Léa'),
      matricule: undefined,
      tauxHoraire: undefined,
      postes: [],
      natures: [],
    });

    const formulaire = FormulaireOperateur.pourModification(sansOptions);

    expect(formulaire.saisie.matricule).toBe('');
    expect(formulaire.saisie.tauxHoraire).toBe('');
  });

  it('should produce a creation command carrying the optional entries', () => {
    const formulaire = formulaireValideFixture().avecMatricule('049').avecTauxHoraire('22,5').avecPosteAjoute(tourFixture);

    expect(formulaire.produireCommande()).toEqual({
      ok: true,
      value: {
        type: 'CREATION',
        nom: new NomOperateur('Dupont'),
        prenom: new PrenomOperateur('Jean'),
        matricule: new Matricule('049'),
        tauxHoraire: new TauxHoraire(22.5),
        postes: [tourFixture.id],
      },
    });
  });

  it('should produce a creation command dropping the blank optional entries', () => {
    const formulaire = formulaireValideFixture().avecMatricule('  ').avecTauxHoraire('  ');

    expect(formulaire.produireCommande()).toEqual({
      ok: true,
      value: {
        type: 'CREATION',
        nom: new NomOperateur('Dupont'),
        prenom: new PrenomOperateur('Jean'),
        matricule: undefined,
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
        matricule: new Matricule('049'),
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

  it('should withdraw a granted habilitation', () => {
    const formulaire = formulaireValideFixture().avecPosteAjoute(tourFixture).avecPosteRetire(tourFixture.id);

    expect(formulaire.saisie.postes).toEqual([]);
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

  it('should keep a duplicate identity refusal while the identity is retyped identically', () => {
    const refuse = formulaireValideFixture().avecRefus(new IdentiteDejaUtilisee()).avecNom('Dupont');

    expect(refuse.erreurNom()).toBe('Un autre opérateur porte déjà ce nom et ce prénom.');
  });

  it('should clear a duplicate payroll number refusal once the payroll number changes', () => {
    const refuse = formulaireValideFixture().avecMatricule('049').avecRefus(new MatriculeDejaUtilise());

    const corrige = refuse.avecMatricule('050');

    expect(refuse.erreurMatricule()).toBe('Un autre opérateur porte déjà ce matricule.');
    expect(corrige.erreurMatricule()).toBeUndefined();
  });

  it('should keep a duplicate payroll number refusal while another entry changes', () => {
    const refuse = formulaireValideFixture().avecMatricule('049').avecRefus(new MatriculeDejaUtilise()).avecTauxHoraire('22');

    expect(refuse.erreurMatricule()).toBe('Un autre opérateur porte déjà ce matricule.');
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

  it('should report an oversized payroll number', () => {
    const formulaire = formulaireValideFixture().avecMatricule('a'.repeat(51));

    expect(formulaire.erreurMatricule()).toBe('Le matricule est limité à 50 caractères.');
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
