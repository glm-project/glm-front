import { ActiviteTerminee } from '../journee/ActiviteDeLaJournee';
import { ActiviteDeLaJourneeId } from '../journee/ActiviteDeLaJourneeId';
import { SuiviDAtelierId } from '../journee/SuiviDAtelierId';

export class SaisieDeRetrait {
  private constructor(
    readonly id: string,
    readonly suivi: SuiviDAtelierId,
    readonly activite: ActiviteDeLaJourneeId,
  ) {}

  static pour(precedente: SaisieDeRetrait | undefined, activite: ActiviteTerminee, nouvelIdentifiant: () => string): SaisieDeRetrait {
    if (precedente?.vise(activite) === true) {
      return precedente;
    }
    return new SaisieDeRetrait(nouvelIdentifiant(), activite.suivi, activite.id);
  }

  private vise(activite: ActiviteTerminee): boolean {
    return this.activite.value === activite.id.value;
  }
}
