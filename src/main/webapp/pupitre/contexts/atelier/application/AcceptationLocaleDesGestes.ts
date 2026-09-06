import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { AcceptationDeGestes, FenetreOperateur, LotDeGestesDAtelier } from '@/pupitre/contexts/atelier/domain/designation/FenetreOperateur';
import { IdentiteDuGeste } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { inject, Injectable } from '@angular/core';
import { IntentionGlobaleInitiee } from './CommandeGlobale';

type IntentionDeCapture =
  | { readonly kind: 'PREPAREE'; readonly gestes: LotDeGestesDAtelier }
  | { readonly kind: 'GLOBALE'; readonly intention: IntentionGlobaleInitiee };

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
    intention: IntentionDeCapture,
    fenetreCourante: () => FenetreOperateur,
  ): Promise<AcceptationLocale> {
    const accepted = this.saisie.then(() => this.persist(fenetreInitiale, intention, fenetreCourante));
    this.saisie = accepted.then(() => undefined).catch(() => undefined);
    return accepted;
  }

  drain(): Promise<void> {
    return this.saisie;
  }

  private async persist(
    fenetreInitiale: FenetreOperateur,
    intention: IntentionDeCapture,
    fenetreCourante: () => FenetreOperateur,
  ): Promise<AcceptationLocale> {
    await this.authentication.synchronizeSession();
    fenetreInitiale.assertEntreprise(this.authentication.currentTenant());
    const fenetre = fenetreCourante();
    const acceptance = fenetre.prepareAcceptance(this.prepare(fenetre, intention));
    await this.journal.append(fenetreInitiale.journalScope(), acceptance.gestes);
    return { applyTo: acceptance.applyTo };
  }

  private prepare(fenetre: FenetreOperateur, intention: IntentionDeCapture): LotDeGestesDAtelier {
    if (intention.kind === 'PREPAREE') return intention.gestes;
    const identify = this.identitiesFrom(intention.intention);
    if (intention.intention.commande === 'TOUT_ARRETER') return fenetre.prepareToutArreter(identify);
    const presence = intention.intention.commande === 'REPRENDRE' ? 'REPRISE' : 'PAUSE';
    return fenetre.preparePresence(presence, identify);
  }

  private identitiesFrom(intention: IntentionGlobaleInitiee): () => IdentiteDuGeste {
    const prefix = intention.id.slice(0, -8);
    const firstSuffix = Number.parseInt(intention.id.slice(-8), 16);
    let offset = 0;
    return () => {
      const suffix = ((firstSuffix + offset) >>> 0).toString(16).padStart(8, '0');
      offset += 1;
      return { id: `${prefix}${suffix}`, dateDeSurvenue: intention.dateDeSurvenue };
    };
  }
}
