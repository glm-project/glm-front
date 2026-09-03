import { Oauth2AuthService } from '@/app/auth/oauth2-auth.service';
import Login from '@/app/login/login';
import { NgOptimizedImage } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';

import { RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'glm-root',
  host: { 'data-selector': 'backoffice-shell' },
  templateUrl: './app.html',
  imports: [RouterModule, MatMenuModule, MatToolbarModule, MatIconModule, MatButtonModule, NgOptimizedImage, Login],
  styleUrl: './app.css',
})
export class App implements OnInit {
  appName = signal('');
  private readonly oauth2AuthService = inject(Oauth2AuthService);

  ngOnInit(): void {
    this.appName.set('glmfront');
    this.oauth2AuthService.initAuthentication();
  }
}
