import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { AcceptationDeGestes, FenetreOperateur, LotDeGestesDAtelier } from '@/pupitre/contexts/atelier/domain/designation/FenetreOperateur';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { inject, Injectable } from '@angular/core';
import { IntentionGlobaleInitiee } from '../domain/designation/IntentionGlobaleInitiee';

export type IntentionDeCapture =
  | { readonly kind: 'PREPAREE'; readonly gestes: LotDeGestesDAtelier }
  | { readonly kind: 'GLOBALE'; readonly commande: IntentionGlobaleInitiee };

export interface AcceptationLocale {
  readonly applyTo: AcceptationDeGestes['applyTo'];
}

@Injectable()
export class AcceptationLocaleDesGestes {
  private readonly authentication = inject(AuthenticationPort);
  private readonly journal = inject(JournauxDuPupitrePort);
  private saisie: Promise<void> = Promise.resolve();

  capture(
    fenetreInitiale: FenetreOperateur,
    capture: IntentionDeCapture,
    fenetreCourante: () => FenetreOperateur,
  ): Promise<AcceptationLocale> {
    const accepted = this.saisie.then(() => this.persist(fenetreInitiale, capture, fenetreCourante));
    this.saisie = accepted.then(() => undefined).catch(() => undefined);
    return accepted;
  }

  drain(): Promise<void> {
    return this.saisie;
  }

  private async persist(
    fenetreInitiale: FenetreOperateur,
    capture: IntentionDeCapture,
    fenetreCourante: () => FenetreOperateur,
  ): Promise<AcceptationLocale> {
    await this.authentication.synchronizeSession();
    fenetreInitiale.assertEntreprise(this.authentication.currentTenant());
    const fenetre = fenetreCourante();
    const acceptance = fenetre.prepareAcceptance(this.prepare(fenetre, capture));
    await this.journal.append(fenetreInitiale.journalScope(), acceptance.gestes);
    return { applyTo: acceptance.applyTo };
  }

  private prepare(fenetre: FenetreOperateur, capture: IntentionDeCapture): LotDeGestesDAtelier {
    if (capture.kind === 'PREPAREE') return capture.gestes;
    return capture.commande.prepare(fenetre);
  }
}
