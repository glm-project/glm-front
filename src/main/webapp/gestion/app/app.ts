import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Component, inject, OnInit, signal } from '@angular/core';

import { RouterModule } from '@angular/router';

import { GestionHeader } from '../header/header';

@Component({
  selector: 'glm-root',
  host: { 'data-selector': 'gestion-shell', class: 'flex min-h-dvh flex-col bg-canvas text-ink' },
  templateUrl: './app.html',
  imports: [RouterModule, GestionHeader],
})
export class App implements OnInit {
  appName = signal('GLM');
  private readonly authentication = inject(AuthenticationPort);
  private readonly errorHandler = inject(ErrorHandlerPort);

  ngOnInit(): void {
    this.errorHandler.observe(this.authentication.authenticate());
  }
}
