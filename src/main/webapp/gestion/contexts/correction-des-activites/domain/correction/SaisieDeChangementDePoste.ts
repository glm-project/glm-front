import { ActiviteTerminee } from '../journee/ActiviteDeLaJournee';
import { ActiviteDeLaJourneeId } from '../journee/ActiviteDeLaJourneeId';
import { PosteDeLaJournee } from '../journee/PosteDeLaJournee';
import { PosteDeLaJourneeId } from '../journee/PosteDeLaJourneeId';
import { SuiviDAtelierId } from '../journee/SuiviDAtelierId';

interface ContenuDeLaSaisieDeChangementDePoste {
  readonly id: string;
  readonly suivi: SuiviDAtelierId;
  readonly activite: ActiviteDeLaJourneeId;
  readonly poste: PosteDeLaJourneeId;
}

export class SaisieDeChangementDePoste {
  readonly id: string;
  readonly suivi: SuiviDAtelierId;
  readonly activite: ActiviteDeLaJourneeId;
  readonly poste: PosteDeLaJourneeId;

  private constructor(contenu: ContenuDeLaSaisieDeChangementDePoste) {
    this.id = contenu.id;
    this.suivi = contenu.suivi;
    this.activite = contenu.activite;
    this.poste = contenu.poste;
  }

  static pour(
    precedente: SaisieDeChangementDePoste | undefined,
    activite: ActiviteTerminee,
    poste: PosteDeLaJournee,
    nouvelIdentifiant: () => string,
  ): SaisieDeChangementDePoste {
    if (precedente?.porte(activite, poste) === true) {
      return precedente;
    }
    return new SaisieDeChangementDePoste({ id: nouvelIdentifiant(), suivi: activite.suivi, activite: activite.id, poste: poste.id });
  }

  private porte(activite: ActiviteTerminee, poste: PosteDeLaJournee): boolean {
    return this.activite.value === activite.id.value && this.poste.value === poste.id.value;
  }
}
