import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { OfflinePupitre } from '@/pupitre/contexts/atelier/application/OfflinePupitre';
import { inject, Injectable, OnDestroy } from '@angular/core';

@Injectable()
export class PupitreRuntime implements OnDestroy {
  private readonly authentication = inject(AuthenticationPort);
  private readonly pupitre = inject(OfflinePupitre);
  private interval: ReturnType<typeof setInterval> | undefined;
  private readonly refresh = (): void => {
    void this.pupitre.synchronize().catch((failure: unknown) => {
      console.error('Pupitre non synchronise', failure);
    });
  };

  readonly connected = this.pupitre.connected;

  async start(): Promise<void> {
    await this.authentication.authenticate();
    window.addEventListener('online', this.refresh);
    this.interval = setInterval(this.refresh, 60_000);
    this.refresh();
  }

  ngOnDestroy(): void {
    clearInterval(this.interval);
    window.removeEventListener('online', this.refresh);
  }
}
