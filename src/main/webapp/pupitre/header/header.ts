import { Component, input } from '@angular/core';

import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'glm-pupitre-header',
  host: { 'data-selector': 'pupitre-header' },
  templateUrl: './header.html',
  styleUrl: './header.css',
  imports: [MatToolbarModule],
})
export class PupitreHeader {
  readonly heading = input.required<string>();
  readonly connected = input.required<boolean>();
}
