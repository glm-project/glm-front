import { PupitreRuntime } from '@/pupitre/PupitreRuntime';
import { Component, ErrorHandler, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'glm-root',
  host: { 'data-selector': 'pupitre-shell' },
  templateUrl: './app.html',
  imports: [RouterModule],
})
export class App implements OnInit {
  private readonly runtime = inject(PupitreRuntime);
  private readonly errorHandler = inject(ErrorHandler);

  ngOnInit(): void {
    this.runtime.start().catch((failure: unknown) => {
      this.errorHandler.handleError(failure);
    });
  }
}
