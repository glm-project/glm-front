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
  protected readonly donnees = resource({ loader: () => this.read() });

  private readonly document = inject(DOCUMENT);
  private refreshOnReturnRequested = false;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    this.startPolling();
    const visibilityChanged = (): void => {
      this.refreshOnReturnRequested = false;
      this.stopPolling();
      if (this.document.visibilityState === 'visible') {
        if (!this.donnees.reload()) {
          this.refreshOnReturnRequested = true;
        }
        this.startPolling();
      }
    };
    this.document.addEventListener('visibilitychange', visibilityChanged);
    inject(DestroyRef).onDestroy(() => {
      this.refreshOnReturnRequested = false;
      this.stopPolling();
      this.document.removeEventListener('visibilitychange', visibilityChanged);
    });
  }

  private async read(): Promise<DonneesDeSupervision> {
    this.refreshOnReturnRequested = false;
    try {
      const donnees = await this.donneesPort.read();
      if (!this.shouldReadAgain()) {
        return donnees;
      }
    } catch (error) {
      if (!this.shouldReadAgain()) {
        throw error;
      }
    }
    return this.read();
  }

  private shouldReadAgain(): boolean {
    return this.refreshOnReturnRequested;
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
