import { Matricule } from './Matricule';
import { NomOperateur } from './NomOperateur';
import { Operateur } from './Operateur';
import { OperateurId } from './OperateurId';
import { PosteHabilitable } from './PosteHabilitable';
import { PosteHabilitableId } from './PosteHabilitableId';
import { PrenomOperateur } from './PrenomOperateur';
import { TauxHoraire } from './TauxHoraire';

describe('Operateur', () => {
  it('should carry the identity, the habilitations and the trades derived by the server', () => {
    const tour = new PosteHabilitable(new PosteHabilitableId('tour-1'), { libelle: 'Tour 1', nature: 'tournage' });

    const operateur = new Operateur(new OperateurId('jean'), {
      nom: new NomOperateur('Dupont'),
      prenom: new PrenomOperateur('Jean'),
      matricule: new Matricule('049'),
      tauxHoraire: new TauxHoraire(22),
      postes: [tour],
      natures: ['tournage'],
    });

    expect(operateur.id.value).toBe('jean');
    expect(operateur.nom.value).toBe('Dupont');
    expect(operateur.prenom.value).toBe('Jean');
    expect(operateur.matricule?.value).toBe('049');
    expect(operateur.tauxHoraire?.value).toBe(22);
    expect(operateur.postes).toEqual([tour]);
    expect(operateur.natures).toEqual(['tournage']);
  });

  it('should leave the payroll number and the hourly rate absent when the company values neither', () => {
    const operateur = new Operateur(new OperateurId('lea'), {
      nom: new NomOperateur('Martin'),
      prenom: new PrenomOperateur('Léa'),
      matricule: undefined,
      tauxHoraire: undefined,
      postes: [],
      natures: [],
    });

    expect(operateur.matricule).toBeUndefined();
    expect(operateur.tauxHoraire).toBeUndefined();
  });
});
