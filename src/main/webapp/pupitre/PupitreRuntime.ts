import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { OfflinePupitre } from '@/pupitre/contexts/atelier/application/OfflinePupitre';
import { inject, Injectable, OnDestroy } from '@angular/core';

@Injectable()
export class PupitreRuntime implements OnDestroy {
  private readonly authentication = inject(AuthenticationPort);
  private readonly pupitre = inject(OfflinePupitre);
  private startup: Promise<void> | undefined;
  private interval: ReturnType<typeof setInterval> | undefined;
  private destroyed = false;
  private readonly refresh = (): void => {
    void this.synchronize();
  };

  readonly connected = this.pupitre.connected;

  start(): Promise<void> {
    this.startup ??= this.initialize();
    return this.startup;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    clearInterval(this.interval);
    window.removeEventListener('online', this.refresh);
  }

  private async initialize(): Promise<void> {
    await this.authentication.authenticate();
    if (this.destroyed) {
      return;
    }
    window.addEventListener('online', this.refresh);
    this.interval = setInterval(this.refresh, 60_000);
    await this.synchronize();
  }

  private async synchronize(): Promise<void> {
    await this.pupitre.synchronize().catch((failure: unknown) => console.error('Pupitre non synchronise', failure));
  }
}
