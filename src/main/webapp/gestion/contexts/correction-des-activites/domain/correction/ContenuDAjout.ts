import { CategorieDActivite } from '../journee/CategorieDActivite';
import { OperateurDeLaJournee } from '../journee/OperateurDeLaJournee';
import { OperateurDeLaJourneeId } from '../journee/OperateurDeLaJourneeId';
import { PosteDeLaJournee } from '../journee/PosteDeLaJournee';
import { PosteDeLaJourneeId } from '../journee/PosteDeLaJourneeId';
import { SuiviDAtelierId } from '../journee/SuiviDAtelierId';
import { SuiviPresent } from '../journee/SuiviPresent';
import { IntervalleDAjout } from './IntervalleDAjout';
import { PortionsDeLAjout } from './PortionsDeLAjout';

interface FicheDuContenuDAjout {
  readonly operateur: OperateurDeLaJourneeId;
  readonly suivi: SuiviDAtelierId;
  readonly poste: PosteDeLaJourneeId;
  readonly categorie: CategorieDActivite;
  readonly portions: PortionsDeLAjout;
}

export class ContenuDAjout {
  readonly operateur: OperateurDeLaJourneeId;
  readonly suivi: SuiviDAtelierId;
  readonly poste: PosteDeLaJourneeId;
  readonly categorie: CategorieDActivite;
  readonly intervalle: IntervalleDAjout;
  readonly portions: PortionsDeLAjout;

  private constructor(fiche: FicheDuContenuDAjout) {
    this.operateur = fiche.operateur;
    this.suivi = fiche.suivi;
    this.poste = fiche.poste;
    this.categorie = fiche.categorie;
    this.intervalle = fiche.portions.intervalle;
    this.portions = fiche.portions;
  }

  static de(
    operateur: OperateurDeLaJournee,
    suivi: SuiviPresent,
    poste: PosteDeLaJournee,
    categorie: CategorieDActivite,
    portions: PortionsDeLAjout,
  ): ContenuDAjout {
    return new ContenuDAjout({ operateur: operateur.id, suivi: suivi.suivi, poste: poste.id, categorie, portions });
  }
}
