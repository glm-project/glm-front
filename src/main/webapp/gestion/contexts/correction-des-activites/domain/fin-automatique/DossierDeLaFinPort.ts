import { ActiviteDeLaJourneeId } from '../journee/ActiviteDeLaJourneeId';
import { SuiviDAtelierId } from '../journee/SuiviDAtelierId';
import { LectureDuDossierDeLaFin } from './DossierDeLaFin';

export abstract class DossierDeLaFinPort {
  abstract lire(suivi: SuiviDAtelierId, activite: ActiviteDeLaJourneeId): Promise<LectureDuDossierDeLaFin>;
}
