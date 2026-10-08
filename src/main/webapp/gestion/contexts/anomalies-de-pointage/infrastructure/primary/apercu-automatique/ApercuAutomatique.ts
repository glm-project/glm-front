import { DestroyRef, inject, Injectable } from '@angular/core';
import { PreparationActe } from '../../../application/PreparationActe';
import { DossierAnomalie } from '../../../domain/dossier/DossierAnomalie';

export type RelectureDuDossier = () => Promise<DossierAnomalie | undefined>;

const DELAI_DE_FRAPPE_MS = 400;

@Injectable()
export class ApercuAutomatique {
  private readonly preparation = inject(PreparationActe);
  private minuterie: ReturnType<typeof setTimeout> | undefined;
  private lancement = Symbol('lancement');

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.annuler();
    });
  }

  apresFrappe(dossier: DossierAnomalie, relire: RelectureDuDossier): void {
    this.annuler();
    const lancement = this.lancement;
    this.minuterie = setTimeout(() => {
      this.minuterie = undefined;
      void this.apercu(dossier, relire, lancement, false);
    }, DELAI_DE_FRAPPE_MS);
  }

  lancer(dossier: DossierAnomalie, relire: RelectureDuDossier): Promise<void> {
    this.annuler();
    return this.apercu(dossier, relire, this.lancement, false);
  }

  annuler(): void {
    clearTimeout(this.minuterie);
    this.minuterie = undefined;
    this.lancement = Symbol('annulation');
  }

  private async apercu(dossier: DossierAnomalie, relire: RelectureDuDossier, lancement: symbol, relance: boolean): Promise<void> {
    await this.preparation.previewInBackground(dossier);
    if (!this.doitRelire(lancement, relance)) return;
    const relu = await relire();
    if (relu === undefined) return;
    if (this.estAnnule(lancement)) return;
    await this.apercu(relu, relire, lancement, true);
  }

  private doitRelire(lancement: symbol, relance: boolean): boolean {
    return !relance && !this.estAnnule(lancement) && this.preparation.operation().kind === 'CONCURRENCE';
  }

  private estAnnule(lancement: symbol): boolean {
    return this.lancement !== lancement;
  }
}
