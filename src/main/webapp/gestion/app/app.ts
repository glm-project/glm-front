import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { RolesPort } from '@/gestion/shared/authentication/domain/RolesPort';
import { isGestionnaire } from '@/gestion/shared/authentication/infrastructure/primary/gestionnaire';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { RouterModule } from '@angular/router';

import { GestionHeader } from '../header/header';

type Acces = 'EN_COURS' | 'OUVERTE' | 'RESERVEE';

const LIBELLES_SHELL = {
  accesReserve: 'Accès réservé aux gestionnaires',
  accesReserveExplication:
    'Votre compte n’a pas le rôle gestionnaire. Demandez-le à votre administrateur, ou connectez-vous avec un autre compte.',
  deconnexion: 'Se déconnecter',
} as const;

@Component({
  selector: 'glm-root',
  host: { 'data-selector': 'gestion-shell', class: 'flex min-h-dvh flex-col bg-canvas text-ink' },
  templateUrl: './app.html',
  imports: [MatButtonModule, RouterModule, GestionHeader],
})
export class App implements OnInit {
  appName = signal('GLM');
  protected readonly acces = signal<Acces>('EN_COURS');
  protected readonly ouverte = computed(() => this.acces() === 'OUVERTE');
  protected readonly libelles = LIBELLES_SHELL;
  private readonly authentication = inject(AuthenticationPort);
  private readonly roles = inject(RolesPort);
  private readonly errorHandler = inject(ErrorHandlerPort);

  ngOnInit(): void {
    this.errorHandler.observe(
      this.authentication
        .authenticate()
        .then(() => this.roles.realmRoles())
        .then(roles => {
          this.acces.set(isGestionnaire(roles) ? 'OUVERTE' : 'RESERVEE');
        }),
    );
  }

  protected deconnecter(): void {
    this.authentication.logout();
  }
}
