import { IntentionGlobale } from '@/pupitre/contexts/atelier/application/CommandeGlobale';
import { OfflinePupitre } from '@/pupitre/contexts/atelier/application/OfflinePupitre';
import { Designation } from '@/pupitre/contexts/atelier/infrastructure/primary/pupitre/designation/designation';
import { toLibelleContexteAtelier } from '@/pupitre/contexts/atelier/infrastructure/primary/pupitre/LibellesAtelier';
import { Pointage } from '@/pupitre/contexts/atelier/infrastructure/primary/pupitre/pointage/pointage';
import { EnrolementDuPupitre } from '@/pupitre/contexts/enrolement/application/EnrolementDuPupitre';
import { Enrolement } from '@/pupitre/contexts/enrolement/infrastructure/primary/pupitre/enrolement/enrolement';
import { ChangeDetectorRef, Component, computed, ElementRef, ErrorHandler, inject, OnDestroy, OnInit } from '@angular/core';
import { MessageDAtelierVisible, PupitreHeader } from './header/header';

@Component({
  selector: 'glm-pupitre-page',
  imports: [Designation, Enrolement, Pointage, PupitreHeader],
  host: { class: 'flex h-screen flex-col', 'data-selector': 'pupitre-page' },
  templateUrl: './page.html',
})
export class PupitrePage implements OnInit, OnDestroy {
  protected readonly pupitre = inject(OfflinePupitre);
  protected readonly enrolement = inject(EnrolementDuPupitre);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly errorHandler = inject(ErrorHandler);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private consumeNextClick = false;
  protected readonly messageAtelier = computed<MessageDAtelierVisible | undefined>(() => {
    const message = this.pupitre.messageAtelier();
    if (message === undefined || !('contexte' in message)) return message;
    return { message: message.message, contexte: toLibelleContexteAtelier(message.contexte) };
  });

  private readonly guardPointerDown = (event: PointerEvent): void => {
    if (this.comesFromKeypad(event)) return;
    this.consumeNextClick = !this.pupitre.registerPress();
    // This capture-phase native listener bypasses Angular event dispatch; render expiry before a compatibility click can follow.
    this.changeDetector.detectChanges();
    if (this.consumeNextClick) event.preventDefault();
  };

  private readonly guardClick = (event: MouseEvent): void => {
    if (!this.consumeNextClick) return;
    this.consumeNextClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  ngOnInit(): void {
    this.host.nativeElement.addEventListener('pointerdown', this.guardPointerDown, true);
    this.host.nativeElement.addEventListener('click', this.guardClick, true);
  }

  ngOnDestroy(): void {
    this.host.nativeElement.removeEventListener('pointerdown', this.guardPointerDown, true);
    this.host.nativeElement.removeEventListener('click', this.guardClick, true);
    this.observe(this.pupitre.finish());
  }

  protected finish(): void {
    this.observe(this.pupitre.finish());
  }

  protected executeGlobale(intention: IntentionGlobale): void {
    this.observe(this.pupitre.executeGlobale(intention));
  }

  private observe(operation: Promise<void>): void {
    void operation.catch((failure: unknown) => {
      this.errorHandler.handleError(failure);
    });
  }

  private comesFromKeypad(event: Event): boolean {
    return event.target instanceof Element && event.target.closest('glm-designation') !== null;
  }
}
