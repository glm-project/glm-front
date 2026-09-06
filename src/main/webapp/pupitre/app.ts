import { PupitreRuntime } from '@/pupitre/PupitreRuntime';
import { Component, ErrorHandler, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

import { PupitreHeader } from './header/header';

@Component({
  selector: 'glm-root',
  host: { 'data-selector': 'pupitre-shell' },
  templateUrl: './app.html',
  imports: [RouterModule, PupitreHeader],
})
export class App implements OnInit {
  readonly appName = signal('glmfront');
  private readonly runtime = inject(PupitreRuntime);
  readonly connected = this.runtime.connected;

  private readonly errorHandler = inject(ErrorHandler);

  ngOnInit(): void {
    this.runtime.start().catch((failure: unknown) => {
      this.errorHandler.handleError(failure);
    });
  }
}
