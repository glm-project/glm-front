import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'glm-root',
  host: { 'data-selector': 'pupitre-shell' },
  templateUrl: './app.html',
  imports: [RouterModule],
})
export class App {}
