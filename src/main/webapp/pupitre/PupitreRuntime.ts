import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { AtelierCoordinator } from '@/pupitre/contexts/atelier/application/AtelierCoordinator';
import { EtatHorsLigneDuPupitre } from '@/pupitre/contexts/atelier/application/EtatHorsLigneDuPupitre';
import { EnrolementDuPupitre } from '@/pupitre/contexts/enrolement/application/EnrolementDuPupitre';
import { inject, Injectable, OnDestroy } from '@angular/core';

@Injectable()
export class PupitreRuntime implements OnDestroy {
  private readonly enrolement = inject(EnrolementDuPupitre);
  private readonly atelier = inject(AtelierCoordinator);
  private readonly etatHorsLigne = inject(EtatHorsLigneDuPupitre);
  private readonly errorHandler = inject(ErrorHandlerPort);
  private startup: Promise<void> | undefined;
  private interval: ReturnType<typeof setInterval> | undefined;
  private readonly refresh = (): void => {
    void this.synchronize();
  };

  readonly connected = this.etatHorsLigne.connected;

  start(): Promise<void> {
    this.startup ??= this.initialize();
    return this.startup;
  }

  ngOnDestroy(): void {
    clearInterval(this.interval);
    window.removeEventListener('online', this.refresh);
  }

  private async initialize(): Promise<void> {
    window.addEventListener('online', this.refresh);
    this.interval = setInterval(this.refresh, 30_000);
    await this.enrolement.enroler();
  }

  private async synchronize(): Promise<void> {
    await this.atelier.synchronize().catch((failure: unknown) => {
      this.errorHandler.handleError(failure);
    });
  }
}
