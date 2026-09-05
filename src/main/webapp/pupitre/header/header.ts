import { Component, input } from '@angular/core';

@Component({
  selector: 'glm-pupitre-header',
  host: { 'data-selector': 'pupitre-header' },
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class PupitreHeader {
  readonly heading = input.required<string>();
  readonly connected = input.required<boolean>();
}
