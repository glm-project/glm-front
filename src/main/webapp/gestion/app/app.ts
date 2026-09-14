import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { Component, ErrorHandler, inject, OnInit, signal } from '@angular/core';

import { RouterModule } from '@angular/router';

import { GestionHeader } from '../header/header';

@Component({
  selector: 'glm-root',
  host: { 'data-selector': 'gestion-shell' },
  templateUrl: './app.html',
  imports: [RouterModule, GestionHeader],
})
export class App implements OnInit {
  appName = signal('glmfront');
  private readonly authentication = inject(AuthenticationPort);
  private readonly errorHandler = inject(ErrorHandler);

  ngOnInit(): void {
    this.authentication.authenticate().catch((failure: unknown) => {
      this.errorHandler.handleError(failure);
    });
  }
}
