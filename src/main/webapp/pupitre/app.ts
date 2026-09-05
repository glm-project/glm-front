import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { PupitreSynchronizationTrigger } from '@/pupitre/contexts/atelier/infrastructure/primary/pupitre/PupitreSynchronizationTrigger';
import { Component, ErrorHandler, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

import { PupitreHeader } from './header/header';

@Component({
  selector: 'glm-root',
  host: { 'data-selector': 'pupitre-shell' },
  templateUrl: './app.html',
  imports: [RouterModule, PupitreHeader],
})
export class App implements OnInit {
  readonly appName = signal('glmfront');
  private readonly synchronizationTrigger = inject(PupitreSynchronizationTrigger);
  readonly connected = this.synchronizationTrigger.connected;

  private readonly authentication = inject(AuthenticationPort);
  private readonly errorHandler = inject(ErrorHandler);

  ngOnInit(): void {
    this.authentication
      .authenticate()
      .then(() => this.synchronizationTrigger.start())
      .catch((failure: unknown) => this.errorHandler.handleError(failure));
  }
}
