import { Component, computed, DestroyRef, DOCUMENT, inject, resource } from '@angular/core';
import { DonneesDeSupervision, DonneesDeSupervisionPort } from '../../domain/DonneesDeSupervisionPort';
import { Instant } from '../../domain/Instant';
import { OperateurSupervise } from '../../domain/OperateurSupervise';
import { SupervisionDeLAtelier } from '../../domain/SupervisionDeLAtelier';

import { LIBELLES_SUPERVISION } from './LibellesSupervision';

export type EtatVueSupervision =
  | { readonly kind: 'CHARGEMENT' }
  | { readonly kind: 'ERREUR' }
  | { readonly kind: 'SUCCES'; readonly operateurs: readonly OperateurSupervise[] };

@Component({
  selector: 'glm-supervision-atelier',
  templateUrl: './supervision-atelier.html',
  host: { 'data-selector': 'supervision-atelier' },
})
export class SupervisionAtelier {
  protected readonly libelles = LIBELLES_SUPERVISION;
  private readonly donneesPort = inject(DonneesDeSupervisionPort);
  protected readonly donnees = resource({ loader: ({ abortSignal }) => this.read(abortSignal) });

  private readonly document = inject(DOCUMENT);
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    this.startPolling();
    this.observeVisibility();
  }

  private observeVisibility(): void {
    const visibilityChanged = (): void => {
      this.refreshOnVisibilityChange();
    };
    this.document.addEventListener('visibilitychange', visibilityChanged);
    inject(DestroyRef).onDestroy(() => {
      this.stopPolling();
      this.document.removeEventListener('visibilitychange', visibilityChanged);
    });
  }

  private refreshOnVisibilityChange(): void {
    this.stopPolling();
    if (this.document.visibilityState === 'visible') {
      this.resumeRefreshing();
    }
  }

  private resumeRefreshing(): void {
    this.donnees.reload();
    this.startPolling();
  }

  private async read(abortSignal: AbortSignal): Promise<DonneesDeSupervision> {
    let refreshOnReturnRequested = false;
    const visibilityChanged = (): void => {
      refreshOnReturnRequested = this.document.visibilityState === 'visible';
    };
    const shouldReadAgain = (): boolean => refreshOnReturnRequested && !abortSignal.aborted;
    this.document.addEventListener('visibilitychange', visibilityChanged, { signal: abortSignal });
    try {
      const donnees = await this.donneesPort.read();
      if (!shouldReadAgain()) {
        return donnees;
      }
    } catch (error) {
      if (!shouldReadAgain()) {
        throw error;
      }
    } finally {
      this.document.removeEventListener('visibilitychange', visibilityChanged);
    }
    return this.read(abortSignal);
  }

  private startPolling(): void {
    if (this.document.visibilityState === 'visible') {
      this.timer = setInterval(() => this.donnees.reload(), 30_000);
    }
  }

  private stopPolling(): void {
    clearInterval(this.timer);
  }

  protected readonly etat = computed<EtatVueSupervision>(() => {
    if (this.donnees.isLoading()) {
      return { kind: 'CHARGEMENT' };
    }
    if (!this.donnees.hasValue()) {
      return { kind: 'ERREUR' };
    }
    const raw = this.donnees.value();
    const maintenant = new Instant(new Date().toISOString());
    const resultat = SupervisionDeLAtelier.determine(raw.operateurs, raw.journees, raw.activites, maintenant);
    if (!resultat.estExploitable) {
      return { kind: 'ERREUR' };
    }
    return { kind: 'SUCCES', operateurs: resultat.supervision.operateurs };
  });
}
