import { AuthenticationPort } from '@/app/authentication/domain/AuthenticationPort';
import { Header } from '@/app/shared/design-system/infrastructure/primary/header/header';
import { NgOptimizedImage } from '@angular/common';
import { Component, inject, input } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'glm-gestion-header',
  host: { 'data-selector': 'gestion-header' },
  templateUrl: './header.html',
  styleUrl: './header.css',
  imports: [Header, MatButtonModule, MatIconModule, MatMenuModule, NgOptimizedImage],
})
export class GestionHeader {
  readonly heading = input.required<string>();
  private readonly authentication = inject(AuthenticationPort);

  logout(): void {
    this.authentication.logout();
  }
}
