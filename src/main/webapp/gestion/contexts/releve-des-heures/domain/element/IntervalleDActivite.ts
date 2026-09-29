import { InstantDeReleve } from '../releve/InstantDeReleve';
import { CategorieDActivite } from './CategorieDActivite';
import { ElementReleveId } from './ElementReleveId';
import { PosteReleveId } from './PosteReleveId';

const estPresumeSansFin = (fiche: FicheDIntervalle): boolean => fiche.presumee && fiche.fin === undefined;

const commenceAvant = (debut: InstantDeReleve, fin: InstantDeReleve | undefined): boolean => fin === undefined || debut.estAvant(fin);

const finitAvantDeCommencer = (fiche: FicheDIntervalle): boolean => fiche.fin?.estAvant(fiche.debut) === true;

export interface FicheDIntervalle {
  readonly element: ElementReleveId;
  readonly poste: PosteReleveId | undefined;
  readonly nature: string | undefined;
  readonly categorie: CategorieDActivite;
  readonly debut: InstantDeReleve;
  readonly fin: InstantDeReleve | undefined;
  readonly presumee: boolean;
}

export class IntervalleDActivite {
  readonly element: ElementReleveId;
  readonly poste: PosteReleveId | undefined;
  readonly nature: string | undefined;
  readonly categorie: CategorieDActivite;
  readonly debut: InstantDeReleve;
  readonly fin: InstantDeReleve | undefined;
  readonly presumee: boolean;

  constructor(fiche: FicheDIntervalle) {
    if (estPresumeSansFin(fiche)) {
      throw new Error('L’intervalle reçu du serveur est présumé sans fin.');
    }
    if (finitAvantDeCommencer(fiche)) {
      throw new Error('L’intervalle reçu du serveur finit avant de commencer.');
    }
    this.element = fiche.element;
    this.poste = fiche.poste;
    this.nature = fiche.nature;
    this.categorie = fiche.categorie;
    this.debut = fiche.debut;
    this.fin = fiche.fin;
    this.presumee = fiche.presumee;
  }

  chevauche(autre: IntervalleDActivite): boolean {
    return commenceAvant(this.debut, autre.fin) && commenceAvant(autre.debut, this.fin);
  }
}
