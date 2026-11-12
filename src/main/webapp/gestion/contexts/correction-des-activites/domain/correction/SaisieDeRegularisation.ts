import { InstantDuDossier } from '../fin-automatique/InstantDuDossier';
import { ActiviteTerminee } from '../journee/ActiviteDeLaJournee';
import { ActiviteDeLaJourneeId } from '../journee/ActiviteDeLaJourneeId';
import { SuiviDAtelierId } from '../journee/SuiviDAtelierId';

interface ContenuDeLaSaisieDeRegularisation {
  readonly id: string;
  readonly suivi: SuiviDAtelierId;
  readonly activite: ActiviteDeLaJourneeId;
  readonly dateDeSurvenue: string;
}

export class SaisieDeRegularisation {
  readonly id: string;
  readonly suivi: SuiviDAtelierId;
  readonly activite: ActiviteDeLaJourneeId;
  readonly dateDeSurvenue: string;

  private constructor(contenu: ContenuDeLaSaisieDeRegularisation) {
    this.id = contenu.id;
    this.suivi = contenu.suivi;
    this.activite = contenu.activite;
    this.dateDeSurvenue = contenu.dateDeSurvenue;
  }

  static pour(
    precedente: SaisieDeRegularisation | undefined,
    activite: ActiviteTerminee,
    dateDeSurvenue: string,
    nouvelIdentifiant: () => string,
  ): SaisieDeRegularisation {
    if (precedente?.porte(activite, dateDeSurvenue) === true) {
      return precedente;
    }
    return new SaisieDeRegularisation({ id: nouvelIdentifiant(), suivi: activite.suivi, activite: activite.id, dateDeSurvenue });
  }

  private porte(activite: ActiviteTerminee, dateDeSurvenue: string): boolean {
    return (
      this.activite.value === activite.id.value
      && new InstantDuDossier(this.dateDeSurvenue).compareTo(new InstantDuDossier(dateDeSurvenue)) === 0
    );
  }
}
