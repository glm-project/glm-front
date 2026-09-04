import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

import { PupitreHeader } from './header/header';

const NO_PUSH_HAS_FAILED_YET = true;

@Component({
  selector: 'glm-root',
  host: { 'data-selector': 'pupitre-shell' },
  templateUrl: './app.html',
  imports: [RouterModule, PupitreHeader],
})
export class App implements OnInit {
  readonly appName = signal('glmfront');
  readonly connected = signal(NO_PUSH_HAS_FAILED_YET);

  private readonly authentication = inject(AuthenticationPort);

  ngOnInit(): void {
    void this.authentication.authenticate();
  }
}
