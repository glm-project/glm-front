import { computed, inject, Injectable, signal } from '@angular/core';
import { LotDeGestesDAtelier } from '../domain/designation/fenetre-operateur/DecisionDePointage';
import { FenetreOperateur } from '../domain/designation/fenetre-operateur/FenetreOperateur';
import { IdentiteDeFenetre } from '../domain/designation/IdentiteDeFenetre';
import { IntentionGlobaleInitiee } from '../domain/designation/IntentionGlobaleInitiee';
import { IdentiteDuGeste } from '../domain/journal-du-pupitre/JournalDuPupitre';
import { CommandeGlobale, IntentionGlobale } from './CommandeGlobale';
import { CurrentOperateurLifecycle } from './CurrentOperateurLifecycle';
import { EtatHorsLigneDuPupitre } from './EtatHorsLigneDuPupitre';
import { GestesRecordingQueue, IntentionDeCapture } from './GestesRecordingQueue';
import { ExecutionDePointage, IntentionDePointage, PointageCommand } from './PointageCommand';

const identityAt = (instant: number): IdentiteDuGeste => ({
  id: crypto.randomUUID(),
  dateDeSurvenue: new Date(instant).toISOString(),
});
const identity = (): IdentiteDuGeste => identityAt(Date.now());

@Injectable()
export class AtelierCoordinator implements PointageCommand, CommandeGlobale {
  private readonly etatHorsLigne = inject(EtatHorsLigneDuPupitre);
  private readonly designation = inject(CurrentOperateurLifecycle);
  private readonly acceptationLocale = inject(GestesRecordingQueue);
  private readonly echecLocal = signal<IdentiteDeFenetre | undefined>(undefined);

  readonly echecCaptureLocale = computed(() => {
    const echec = this.echecLocal();
    return this.designation.operateur() !== undefined && echec !== undefined && this.designation.isCurrentWindow(echec);
  });

  execute(intention: IntentionDePointage): ExecutionDePointage {
    if (!this.designation.gestesDisponibles()) return { kind: 'INDISPONIBLE' };
    const fenetre = this.designation.requireWindow();
    const result = fenetre.afterDeciding(intention.suiviId, intention.cible, identity);
    this.designation.acceptDecision(result.fenetre);
    const decision = result.decision;
    if (decision.kind === 'CHOIX_POSTE_REQUIS') {
      return {
        kind: decision.kind,
        numero: decision.numero,
        postes: decision.postes,
        choose: posteId => this.choosePoste(fenetre.identity(), intention, posteId),
      };
    }
    return { kind: 'CAPTURE', completion: this.captureDecision(fenetre, decision) };
  }

  executeGlobale(intention: IntentionGlobale): Promise<void> {
    if (!this.designation.gestesDisponibles()) return Promise.resolve();
    const instant = Date.now();
    const current = this.designation.requireWindow(instant);
    const initiee = new IntentionGlobaleInitiee(intention, identityAt(instant));
    const fenetre = current.afterIntendingGlobal(initiee);
    this.designation.acceptDecision(fenetre);
    return this.capture(fenetre, { kind: 'GLOBALE', commande: initiee }).finally(() => {
      this.designation.completeGlobal(fenetre.identity());
    });
  }

  restore(): Promise<void> {
    return this.etatHorsLigne.refresh('RESTORE', (entreprise, state) => {
      this.designation.reconcile(entreprise, state);
    });
  }

  synchronize(): Promise<void> {
    return this.designation.refreshReferentiel();
  }

  private choosePoste(opening: IdentiteDeFenetre, intention: IntentionDePointage, posteId: string): Promise<void> {
    if (!this.designation.gestesDisponibles()) return Promise.resolve();
    this.designation.requireWindow();
    const current = this.designation.currentWindow(opening);
    const result = current.afterChoosingPoste(intention.suiviId, intention.cible, posteId, identity);
    this.designation.acceptDecision(result.fenetre);
    return this.captureDecision(result.fenetre, result.decision);
  }

  private captureDecision(fenetre: FenetreOperateur, gestes: LotDeGestesDAtelier): Promise<void> {
    return this.capture(fenetre, { kind: 'PREPAREE', gestes });
  }

  private capture(fenetre: FenetreOperateur, intention: IntentionDeCapture): Promise<void> {
    const opening = fenetre.identity();
    return this.acceptationLocale
      .capture(fenetre, intention, () => this.designation.currentWindow(opening))
      .then(acceptance => {
        if (this.designation.acceptCapture(opening, acceptance)) this.designation.pushReferentielFreshness();
        this.echecLocal.set(undefined);
      })
      .catch((failure: unknown) => {
        if (this.designation.isCurrentWindow(opening)) this.echecLocal.set(opening);
        throw failure;
      });
  }
}
