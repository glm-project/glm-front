import { DossierDeLaFin, LectureDuDossierDeLaFin } from '@/gestion/contexts/correction-des-activites/domain/fin-automatique/DossierDeLaFin';
import { DossierDeLaFinPort } from '@/gestion/contexts/correction-des-activites/domain/fin-automatique/DossierDeLaFinPort';
import { ActiviteDeLaJourneeId } from '@/gestion/contexts/correction-des-activites/domain/journee/ActiviteDeLaJourneeId';
import { SuiviDAtelierId } from '@/gestion/contexts/correction-des-activites/domain/journee/SuiviDAtelierId';

const auTourSuivant = <T>(valeur: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(valeur)));

export class DossierDeLaFinFixture extends DossierDeLaFinPort {
  readonly lectures: { readonly suivi: string; readonly activite: string }[] = [];
  private readonly reponses: (LectureDuDossierDeLaFin | Error)[] = [];
  private dossier: DossierDeLaFin | undefined;

  semer(dossier: DossierDeLaFin): void {
    this.dossier = dossier;
  }

  repondre(...reponses: (LectureDuDossierDeLaFin | Error)[]): void {
    this.reponses.push(...reponses);
  }

  override lire(suivi: SuiviDAtelierId, activite: ActiviteDeLaJourneeId): Promise<LectureDuDossierDeLaFin> {
    this.lectures.push({ suivi: suivi.value, activite: activite.value });
    const reponse = this.reponses.shift() ?? this.lectureSemee();
    return reponse instanceof Error ? Promise.reject(reponse) : auTourSuivant(reponse);
  }

  private lectureSemee(): LectureDuDossierDeLaFin {
    return this.dossier === undefined ? { kind: 'INTROUVABLE' } : { kind: 'DOSSIER', dossier: this.dossier };
  }
}
