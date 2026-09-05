import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { NgOptimizedImage } from '@angular/common';
import { Component, inject, input } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'glm-gestion-header',
  host: { 'data-selector': 'gestion-header' },
  templateUrl: './header.html',
  styleUrl: './header.css',
  imports: [Icon, MatButtonModule, MatMenuModule, MatToolbarModule, NgOptimizedImage],
})
export class GestionHeader {
  readonly heading = input.required<string>();
  private readonly authentication = inject(AuthenticationPort);

  logout(): void {
    this.authentication.logout();
  }
}
