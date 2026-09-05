import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { PupitreRuntime } from '@/pupitre/contexts/atelier/infrastructure/primary/pupitre/PupitreRuntime';
import { Component, inject, OnInit, signal } from '@angular/core';
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
  private readonly runtime = inject(PupitreRuntime);
  readonly connected = this.runtime.connected;

  private readonly authentication = inject(AuthenticationPort);

  ngOnInit(): void {
    void this.authentication.authenticate().then(() => this.runtime.start());
  }
}
