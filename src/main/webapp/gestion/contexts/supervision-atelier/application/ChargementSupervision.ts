import { Page } from '@/app/shared/pagination/domain/Page';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { ActiviteDeSupervision } from '../domain/ActiviteDeSupervision';
import { ActivitesDeSupervisionPort } from '../domain/ActivitesDeSupervisionPort';
import { Instant } from '../domain/Instant';
import { JourneeDeTravail } from '../domain/JourneeDeTravail';
import { JourneesDeSupervisionPort } from '../domain/JourneesDeSupervisionPort';
import { OperateurDeclare } from '../domain/OperateurDeclare';
import { OperateursDeSupervisionPort } from '../domain/OperateursDeSupervisionPort';
import { SupervisionDeLAtelier } from '../domain/SupervisionDeLAtelier';

export type EtatChargementSupervision =
  | { readonly status: 'loading'; readonly supervision: undefined }
  | { readonly status: 'failed'; readonly supervision: SupervisionDeLAtelier | undefined }
  | { readonly status: 'ready'; readonly supervision: SupervisionDeLAtelier };

@Injectable()
export class ChargementSupervision {
  private readonly lifetime = inject(DestroyRef);
  private readonly operateurs = inject(OperateursDeSupervisionPort);
  private readonly journees = inject(JourneesDeSupervisionPort);
  private readonly activites = inject(ActivitesDeSupervisionPort);
  private readonly current = signal<EtatChargementSupervision>({ status: 'loading', supervision: undefined });
  private reference: Page<OperateurDeclare> | undefined;
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
    const reads = [this.readReference(), this.journees.read(), this.activites.read()] as const;
    try {
      const [operateurs, journees, activites] = await Promise.all(reads);
      if (this.lifetime.destroyed) {
        return;
      }
      this.publish(operateurs, journees, activites, maintenant);
    } catch {
      if (this.lifetime.destroyed) {
        return;
      }
      this.current.set({ status: 'failed', supervision: this.current().supervision });
    } finally {
      await Promise.allSettled(reads);
    }
  }
  private publish(
    operateurs: Page<OperateurDeclare>,
    journees: Page<JourneeDeTravail>,
    activites: Page<ActiviteDeSupervision>,
    maintenant: Instant,
  ): void {
    const complete = [operateurs, journees, activites].every(page => page.isComplete());
    if (!complete) {
      this.current.set({ status: 'failed', supervision: this.current().supervision });
      return;
    }
    const resultat = SupervisionDeLAtelier.determine(operateurs.elements, journees.elements, activites.elements, maintenant);
    if (!resultat.estExploitable) {
      this.current.set({ status: 'failed', supervision: this.current().supervision });
      return;
    }
    this.current.set({ status: 'ready', supervision: resultat.supervision });
  }

  private async readReference(): Promise<Page<OperateurDeclare>> {
    if (this.reference) {
      return this.reference;
    }
    const page = await this.operateurs.read();
    if (page.isComplete()) {
      this.reference = new Page([...page.elements], page.totalCount);
      return this.reference;
    }
    return page;
  }
}
