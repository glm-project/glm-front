import { CibleDePointage } from '../releve/CibleDePointage';
import { InstantDeReleve } from '../releve/InstantDeReleve';
import { ActiviteDuReleve } from './ActiviteDuReleve';
import { CategorieDActivite } from './CategorieDActivite';
import { ElementReleveId } from './ElementReleveId';
import { PosteReleveId } from './PosteReleveId';

export interface FicheDIntervalle {
  readonly element: ElementReleveId;
  readonly poste: PosteReleveId | undefined;
  readonly nature: string | undefined;
  readonly categorie: CategorieDActivite;
  readonly debut: InstantDeReleve;
  readonly fin: InstantDeReleve | undefined;
  readonly activite: ActiviteDuReleve;
}

export class IntervalleDActivite {
  readonly element: ElementReleveId;
  readonly poste: PosteReleveId | undefined;
  readonly nature: string | undefined;
  readonly categorie: CategorieDActivite;
  readonly debut: InstantDeReleve;
  readonly fin: InstantDeReleve | undefined;
  readonly activite: ActiviteDuReleve;

  constructor(fiche: FicheDIntervalle) {
    if (fiche.fin?.estAvant(fiche.debut)) {
      throw new Error('L’intervalle reçu du serveur finit avant de commencer.');
    }
    this.element = fiche.element;
    this.poste = fiche.poste;
    this.nature = fiche.nature;
    this.categorie = fiche.categorie;
    this.debut = fiche.debut;
    this.fin = fiche.fin;
    this.activite = fiche.activite;
  }

  cible(): CibleDePointage {
    return new CibleDePointage(this.element, this.poste);
  }

  estEnCours(): boolean {
    return this.activite.etat === 'EN_COURS';
  }

  finOuDebut(): InstantDeReleve {
    return this.fin ?? this.debut;
  }

  chevauche(autre: IntervalleDActivite): boolean {
    return this.commenceAvantLaFinDe(autre) && autre.commenceAvantLaFinDe(this);
  }

  private commenceAvantLaFinDe(autre: IntervalleDActivite): boolean {
    return autre.fin === undefined || this.debut.estAvant(autre.fin);
  }
}
