import { IdentiteOperateurDesigne } from '@/pupitre/contexts/atelier/domain/designation/fenetre-operateur/OperateurDesigne';
import { LIBELLES_ENTETE_PUPITRE } from '@/pupitre/contexts/atelier/infrastructure/primary/pupitre/LibellesAtelier';
import { Component, input, OnDestroy, output } from '@angular/core';

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
})
export class PupitreHeader implements OnDestroy {
  readonly labels = LIBELLES_ENTETE_PUPITRE;
  readonly heading = input.required<string>();
  readonly connected = input.required<boolean>();
  readonly operateur = input<IdentiteOperateurDesigne>();
  readonly message = input<MessageDAtelierVisible>();
  readonly finRequested = output();
  readonly reinitialisationRequested = output();
  private administrationPress: ReturnType<typeof setTimeout> | undefined;

  ngOnDestroy(): void {
    this.releaseTheLogo();
  }

  protected holdTheLogo(): void {
    this.releaseTheLogo();
    this.administrationPress = setTimeout(() => {
      this.reinitialisationRequested.emit();
    }, ADMINISTRATION_PRESS_MS);
  }

  protected releaseTheLogo(): void {
    clearTimeout(this.administrationPress);
  }
}
