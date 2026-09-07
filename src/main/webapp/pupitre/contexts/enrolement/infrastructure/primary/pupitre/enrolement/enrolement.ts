import { EnrolementDuPupitre } from '@/pupitre/contexts/enrolement/application/EnrolementDuPupitre';
import { VueDEnrolement } from '@/pupitre/contexts/enrolement/domain/Enrolement';
import { Component, computed, ErrorHandler, inject, OnDestroy, OnInit } from '@angular/core';
import { LIBELLES_ENROLEMENT } from '../LibellesEnrolement';
import { QrCode } from '../qr-code/qr-code';

const UNE_SECONDE = 1000;

type IntentionDEnrolement = 'NOUVELLE_DEMANDE' | 'CHARGER_ATELIER';

interface ActionDEnrolement {
  readonly libelle: string;
  readonly intention: IntentionDEnrolement;
}

const ACTIONS: Partial<Record<VueDEnrolement['kind'], ActionDEnrolement>> = {
  EXPIRE: { libelle: LIBELLES_ENROLEMENT.nouveauCode, intention: 'NOUVELLE_DEMANDE' },
  REFUSE: { libelle: LIBELLES_ENROLEMENT.recommencer, intention: 'NOUVELLE_DEMANDE' },
  ERREUR_RESEAU_INITIALE: { libelle: LIBELLES_ENROLEMENT.reessayer, intention: 'NOUVELLE_DEMANDE' },
  ATTENTE_RESEAU_ATELIER: { libelle: LIBELLES_ENROLEMENT.reessayer, intention: 'CHARGER_ATELIER' },
};

@Component({
  selector: 'glm-enrolement',
  imports: [QrCode],
  host: { 'data-selector': 'enrolement', class: 'block min-h-0 flex-1' },
  templateUrl: './enrolement.html',
  styleUrl: './enrolement.css',
})
export class Enrolement implements OnInit, OnDestroy {
  protected readonly labels = LIBELLES_ENROLEMENT;
  protected readonly enrolement = inject(EnrolementDuPupitre);
  private readonly errorHandler = inject(ErrorHandler);
  private tic: ReturnType<typeof setInterval> | undefined;

  protected readonly statut = computed<string>(() => LIBELLES_ENROLEMENT.statut(this.enrolement.vue().kind));
  protected readonly action = computed<ActionDEnrolement | undefined>(() => ACTIONS[this.enrolement.vue().kind]);

  ngOnInit(): void {
    this.tic = setInterval(() => {
      this.enrolement.rafraichir();
    }, UNE_SECONDE);
  }

  ngOnDestroy(): void {
    clearInterval(this.tic);
  }

  protected declencher(intention: IntentionDEnrolement): void {
    this.observe(intention === 'CHARGER_ATELIER' ? this.enrolement.chargerLAtelier() : this.enrolement.enroler());
  }

  private observe(operation: Promise<void>): void {
    void operation.catch((failure: unknown) => {
      this.errorHandler.handleError(failure);
    });
  }
}
