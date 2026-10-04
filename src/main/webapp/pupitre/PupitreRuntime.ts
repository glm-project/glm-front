import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { AtelierCoordinator } from '@/pupitre/contexts/atelier/application/AtelierCoordinator';
import { EtatHorsLigneDuPupitre } from '@/pupitre/contexts/atelier/application/EtatHorsLigneDuPupitre';
import { EnrolementDuPupitre } from '@/pupitre/contexts/enrolement/application/EnrolementDuPupitre';
import { DeviceAuthorizationPort, EnrolmentRequirement } from '@/pupitre/shared/authentication/domain/DeviceAuthorizationPort';
import { inject, Injectable, OnDestroy } from '@angular/core';

@Injectable()
export class PupitreRuntime implements OnDestroy {
  private readonly enrolement = inject(EnrolementDuPupitre);
  private readonly atelier = inject(AtelierCoordinator);
  private readonly etatHorsLigne = inject(EtatHorsLigneDuPupitre);
  private readonly errorHandler = inject(ErrorHandlerPort);
  private readonly authorization = inject(DeviceAuthorizationPort);
  private startup: Promise<void> | undefined;
  private interval: ReturnType<typeof setInterval> | undefined;
  private requirement: EnrolmentRequirement | undefined;
  private destroyed = false;
  private readonly refresh = (): void => {
    this.errorHandler.observe(this.atelier.synchronize());
  };

  readonly connected = this.etatHorsLigne.connected;

  start(): Promise<void> {
    this.startup ??= this.initialize();
    return this.startup;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.requirement?.stop();
    clearInterval(this.interval);
    window.removeEventListener('online', this.refresh);
  }

  private async initialize(): Promise<void> {
    window.addEventListener('online', this.refresh);
    this.interval = setInterval(this.refresh, 30_000);
    this.errorHandler.observe(this.followAuthorization());
    await this.enrolement.enroler();
  }

  private async followAuthorization(): Promise<void> {
    while (!this.destroyed) {
      this.requirement = this.authorization.waitForRequiredEnrolment();
      const outcome = await this.requirement.outcome;
      if (this.isStopped(outcome)) {
        return;
      }
      await this.enrolement.enroler();
    }
  }

  private isStopped(outcome: 'REQUIRED' | 'STOPPED'): boolean {
    return this.destroyed || outcome === 'STOPPED';
  }
}
