import { IdentiteOperateurDesigne } from '@/pupitre/contexts/atelier/domain/designation/fenetre-operateur/OperateurDesigne';
import { LIBELLES_ENTETE_PUPITRE } from '@/pupitre/contexts/atelier/infrastructure/primary/pupitre/LibellesAtelier';
import { LongPress } from '@/pupitre/shared/design-system/infrastructure/primary/long-press/long-press';
import { Component, input, output } from '@angular/core';

const ADMINISTRATION_PRESS_MS = 3000;

export interface MessageDAtelierVisible {
  readonly contexte?: string;
  readonly message: string;
}

@Component({
  selector: 'glm-pupitre-header',
  host: { 'data-selector': 'pupitre-header' },
  templateUrl: './header.html',
  styleUrl: './header.css',
  imports: [LongPress],
})
export class PupitreHeader {
  readonly labels = LIBELLES_ENTETE_PUPITRE;
  readonly heading = input.required<string>();
  readonly connected = input.required<boolean>();
  readonly operateur = input<IdentiteOperateurDesigne>();
  readonly enPause = input(false);
  readonly logo = input<string>();
  readonly message = input<MessageDAtelierVisible>();
  readonly finRequested = output();
  readonly reinitialisationRequested = output();
  protected readonly administrationPressMs = ADMINISTRATION_PRESS_MS;
}
