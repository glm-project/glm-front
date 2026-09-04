import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { NgOptimizedImage } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';

import { RouterModule } from '@angular/router';

import { GestionHeader } from './header/header';

@Component({
  selector: 'glm-root',
  host: { 'data-selector': 'gestion-shell' },
  templateUrl: './app.html',
  imports: [RouterModule, NgOptimizedImage, GestionHeader],
  styleUrl: './app.css',
})
export class App implements OnInit {
  appName = signal('');
  private readonly authentication = inject(AuthenticationPort);

  ngOnInit(): void {
    this.appName.set('glmfront');
    this.authentication.authenticate();
  }
}
