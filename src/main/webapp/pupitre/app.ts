import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

import { PupitreHeader } from './header/header';

const NO_PUSH_HAS_FAILED_YET = true;

@Component({
  selector: 'glm-root',
  host: { 'data-selector': 'pupitre-shell' },
  templateUrl: './app.html',
  imports: [RouterModule, PupitreHeader],
})
export class App {
  readonly appName = signal('glmfront');
  readonly connected = signal(NO_PUSH_HAS_FAILED_YET);
}
