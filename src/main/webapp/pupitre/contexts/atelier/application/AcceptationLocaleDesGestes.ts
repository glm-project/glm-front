import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { FenetreOperateur, GestesDePointage } from '@/pupitre/contexts/atelier/domain/designation/FenetreOperateur';
import { GesteDAtelier, IdentiteDuGeste } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { inject, Injectable } from '@angular/core';
import { IntentionGlobale } from './CommandeGlobale';

type IntentionDeCapture =
  | { readonly kind: 'PREPAREE'; readonly gestes: GestesDePointage }
  | { readonly kind: 'GLOBALE'; readonly commande: IntentionGlobale; readonly instantDePression: number };

@Injectable()
export class AcceptationLocaleDesGestes {
  private readonly authentication = inject(AuthenticationPort);
  private readonly journal = inject(JournauxDuPupitrePort);
  private saisie: Promise<void> = Promise.resolve();

  capture(
    fenetreInitiale: FenetreOperateur,
    intention: IntentionDeCapture,
    fenetreCourante: () => FenetreOperateur,
  ): Promise<readonly GesteDAtelier[]> {
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
  ): Promise<readonly GesteDAtelier[]> {
    await this.authentication.synchronizeSession();
    fenetreInitiale.assertEntreprise(this.authentication.currentTenant());
    const fenetre = fenetreCourante();
    const captured = fenetre.capture(this.prepare(fenetre, intention));
    await this.journal.append(fenetreInitiale.journalScope(), captured);
    return captured;
  }

  private prepare(fenetre: FenetreOperateur, intention: IntentionDeCapture): GestesDePointage {
    if (intention.kind === 'PREPAREE') return intention.gestes;
    const identify = this.identityAt(intention.instantDePression);
    if (intention.commande === 'TOUT_ARRETER') return fenetre.prepareToutArreter(identify);
    const presence = intention.commande === 'REPRENDRE' ? 'REPRISE' : 'PAUSE';
    return fenetre.preparePresence(presence, identify);
  }

  private identityAt(instant: number): () => IdentiteDuGeste {
    const dateDeSurvenue = new Date(instant).toISOString();
    return () => ({ id: crypto.randomUUID(), dateDeSurvenue });
  }
}
