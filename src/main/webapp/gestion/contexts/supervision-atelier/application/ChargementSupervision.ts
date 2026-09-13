import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { DonneesDeSupervisionPort, LectureDeSupervision } from '../domain/DonneesDeSupervisionPort';
import { Instant } from '../domain/Instant';
import { SupervisionDeLAtelier } from '../domain/SupervisionDeLAtelier';

export type EtatChargementSupervision =
  | { readonly status: 'loading'; readonly supervision: undefined }
  | { readonly status: 'failed'; readonly supervision: SupervisionDeLAtelier | undefined }
  | { readonly status: 'ready'; readonly supervision: SupervisionDeLAtelier };

@Injectable()
export class ChargementSupervision {
  private readonly lifetime = inject(DestroyRef);
  private readonly errorHandler = inject(ErrorHandlerPort);
  private readonly donnees = inject(DonneesDeSupervisionPort);
  private readonly current = signal<EtatChargementSupervision>({ status: 'loading', supervision: undefined });
  private inFlight: Promise<void> | undefined;
  readonly state = this.current.asReadonly();

  refresh(maintenant: Instant): Promise<void> {
    if (this.lifetime.destroyed) {
      return Promise.resolve();
    }
    this.inFlight ??= this.load(maintenant).finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  private async load(maintenant: Instant): Promise<void> {
    try {
      const lecture = await this.donnees.read();
      if (this.lifetime.destroyed) {
        return;
      }
      this.publish(lecture, maintenant);
    } catch (failure: unknown) {
      if (this.lifetime.destroyed) {
        return;
      }
      this.errorHandler.handleError(failure);
      this.current.set({ status: 'failed', supervision: this.current().supervision });
    }
  }

  private publish(lecture: LectureDeSupervision, maintenant: Instant): void {
    if (lecture.status === 'incomplete') {
      this.current.set({ status: 'failed', supervision: this.current().supervision });
      return;
    }
    const { operateurs, journees, activites } = lecture.donnees;
    const resultat = SupervisionDeLAtelier.determine(operateurs, journees, activites, maintenant);
    if (!resultat.estExploitable) {
      this.current.set({ status: 'failed', supervision: this.current().supervision });
      return;
    }
    this.current.set({ status: 'ready', supervision: resultat.supervision });
  }
}
