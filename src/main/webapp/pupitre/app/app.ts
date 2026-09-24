import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { PupitreRuntime } from '@/pupitre/PupitreRuntime';
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'glm-root',
  host: { 'data-selector': 'pupitre-shell' },
  templateUrl: './app.html',
  imports: [RouterModule],
})
export class App implements OnInit {
  private readonly runtime = inject(PupitreRuntime);
  private readonly errorHandler = inject(ErrorHandlerPort);

  ngOnInit(): void {
    this.errorHandler.observe(this.runtime.start());
  }
}
