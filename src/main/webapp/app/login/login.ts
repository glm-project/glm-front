import { AuthenticationPort } from '@/app/authentication/domain/AuthenticationPort';
import { Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'glm-login',
  templateUrl: './login.html',
  imports: [MatButtonModule],
})
export default class Login {
  private readonly authentication = inject(AuthenticationPort);

  logout(): void {
    this.authentication.logout();
  }
}
