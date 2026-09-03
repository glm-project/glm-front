import { Component, input } from '@angular/core';

import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'glm-header',
  templateUrl: './header.html',
  styleUrl: './header.css',
  imports: [MatToolbarModule],
})
export class Header {
  readonly heading = input.required<string>();
}
