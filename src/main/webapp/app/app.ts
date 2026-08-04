import { NgOptimizedImage } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';

import { Oauth2AuthService } from './auth/oauth2-auth.service';
import Login from './login/login';

import { RouterModule } from '@angular/router';

import { HlmButtonImports, HlmDropdownMenuImports } from '@/app/design-system';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMenu } from '@ng-icons/lucide';

@Component({
  selector: 'seed-root',
  templateUrl: './app.html',
  imports: [RouterModule, HlmDropdownMenuImports, HlmButtonImports, NgIcon, NgOptimizedImage, Login],
  providers: [provideIcons({ lucideMenu })],
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
