import { CategorieDActivite } from '../journee/CategorieDActivite';
import { InstantDeLaJournee } from '../journee/InstantDeLaJournee';
import { OperateurDeLaJourneeId } from '../journee/OperateurDeLaJourneeId';
import { PosteDeLaJourneeId } from '../journee/PosteDeLaJourneeId';
import { SuiviDAtelierId } from '../journee/SuiviDAtelierId';
import { ContenuDAjout } from './ContenuDAjout';

interface FicheDeLaSaisieDAjout {
  readonly id: string;
  readonly contenu: ContenuDAjout;
}

export class SaisieDAjout {
  readonly id: string;
  readonly operateur: OperateurDeLaJourneeId;
  readonly suivi: SuiviDAtelierId;
  readonly poste: PosteDeLaJourneeId;
  readonly categorie: CategorieDActivite;
  readonly debut: InstantDeLaJournee;
  readonly fin: InstantDeLaJournee;

  private constructor(fiche: FicheDeLaSaisieDAjout) {
    this.id = fiche.id;
    this.operateur = fiche.contenu.operateur;
    this.suivi = fiche.contenu.suivi;
    this.poste = fiche.contenu.poste;
    this.categorie = fiche.contenu.categorie;
    this.debut = fiche.contenu.intervalle.debut;
    this.fin = fiche.contenu.intervalle.fin;
  }

  static pour(precedente: SaisieDAjout | undefined, contenu: ContenuDAjout, nouvelIdentifiant: () => string): SaisieDAjout {
    if (precedente?.porte(contenu) === true) {
      return precedente;
    }
    return new SaisieDAjout({ id: nouvelIdentifiant(), contenu });
  }

  private porte(contenu: ContenuDAjout): boolean {
    return (
      this.operateur.value === contenu.operateur.value
      && this.suivi.value === contenu.suivi.value
      && this.poste.value === contenu.poste.value
      && this.categorie === contenu.categorie
      && this.debut.value.getTime() === contenu.intervalle.debut.value.getTime()
      && this.fin.value.getTime() === contenu.intervalle.fin.value.getTime()
    );
  }
}
