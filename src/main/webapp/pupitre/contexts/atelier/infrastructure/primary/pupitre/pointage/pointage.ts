import { NgTemplateOutlet } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { ExecutionDePointage, IntentionDePointage, PointageCommand } from '../../../../application/PointageCommand';
import { CibleDePointage, ElementDePointage, VueDePointage } from '../../../../domain/designation/FenetreOperateur';
import { LIBELLES_POINTAGE } from '../LibellesAtelier';

interface AttenteDePoste {
  intention: IntentionDePointage;
  execution: Extract<ExecutionDePointage, { kind: 'CHOIX_POSTE_REQUIS' }>;
}

@Component({
  selector: 'glm-pointage',
  host: { 'data-selector': 'pointage', class: 'flex min-h-0 flex-1 flex-col' },
  templateUrl: './pointage.html',
  styleUrl: './pointage.css',
  imports: [NgTemplateOutlet],
})
export class Pointage {
  readonly vue = input.required<VueDePointage>();
  readonly commander = input.required<PointageCommand>();
  readonly pauseRequested = output();
  readonly repriseRequested = output();
  readonly arretTotalRequested = output();
  readonly busy = signal<ReadonlySet<string>>(new Set());
  readonly attente = signal<AttenteDePoste | undefined>(undefined);
  readonly choosing = signal(false);
  readonly labels = LIBELLES_POINTAGE;

  press(element: ElementDePointage, cible: CibleDePointage): void {
    const intention: IntentionDePointage = { suiviId: element.id, cible };
    const execution = this.commander().execute(intention);
    if (execution.kind === 'CHOIX_POSTE_REQUIS') {
      this.attente.set({ intention, execution });
      return;
    }
    void this.capture(element.id, execution.completion);
  }

  choose(attente: AttenteDePoste, posteId: string): void {
    this.choosing.set(true);
    const completion = Promise.resolve().then(() => attente.execution.choose(posteId));
    void this.capture(attente.intention.suiviId, completion).finally(() => {
      this.choosing.set(false);
      this.attente.set(undefined);
    });
  }

  cancelChoice(): void {
    this.attente.set(undefined);
  }

  private capture(suiviId: string, completion: Promise<void>): Promise<void> {
    this.setBusy(suiviId, true);
    return completion
      .catch(() => undefined)
      .finally(() => {
        this.setBusy(suiviId, false);
      });
  }

  private setBusy(suiviId: string, busy: boolean): void {
    const next = new Set(this.busy());
    if (busy) next.add(suiviId);
    else next.delete(suiviId);
    this.busy.set(next);
  }
}
