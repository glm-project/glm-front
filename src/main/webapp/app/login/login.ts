import { Component, inject } from '@angular/core';
import { Oauth2AuthService } from '../auth/oauth2-auth.service';

import { HlmButtonImports } from '@/app/design-system';

@Component({
  selector: 'seed-login',
  templateUrl: './login.html',
  imports: [HlmButtonImports],
})
export default class Login {
  private readonly oauth2AuthService = inject(Oauth2AuthService);

  logout(): void {
    this.oauth2AuthService.logout();
  }
}
