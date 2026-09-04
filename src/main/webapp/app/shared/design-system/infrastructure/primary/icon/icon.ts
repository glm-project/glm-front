import { Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMenu } from '@ng-icons/lucide';

const DRAWINGS = { menu: lucideMenu };

export type IconName = keyof typeof DRAWINGS;

@Component({
  selector: 'glm-icon',
  templateUrl: './icon.html',
  imports: [NgIcon],
  viewProviders: [provideIcons(DRAWINGS)],
})
export class Icon {
  readonly name = input.required<IconName>();
}
