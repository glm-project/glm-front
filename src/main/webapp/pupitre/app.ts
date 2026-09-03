import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'glm-root',
  // The attribute lands on the host only once Angular has bootstrapped, which is what the per-front
  // smoke tests assert: `<glm-root>` itself is already in the static index.html.
  host: { 'data-selector': 'pupitre-shell' },
  templateUrl: './app.html',
  imports: [RouterModule],
})
export class App {}
