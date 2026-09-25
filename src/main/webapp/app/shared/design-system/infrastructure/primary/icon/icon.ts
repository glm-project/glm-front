import { Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideChevronDown,
  lucideChevronLeft,
  lucideChevronRight,
  lucideCircleDashed,
  lucideClock,
  lucideLogOut,
  lucideMenu,
  lucidePause,
  lucidePencil,
  lucidePlus,
  lucideRefreshCw,
  lucideSearch,
  lucideTrash2,
  lucideTriangleAlert,
  lucideX,
} from '@ng-icons/lucide';

const DRAWINGS = {
  arrowLeft: lucideArrowLeft,
  chevronDown: lucideChevronDown,
  chevronLeft: lucideChevronLeft,
  chevronRight: lucideChevronRight,
  circleDashed: lucideCircleDashed,
  clock: lucideClock,
  logOut: lucideLogOut,
  menu: lucideMenu,
  pause: lucidePause,
  plus: lucidePlus,
  pencil: lucidePencil,
  refresh: lucideRefreshCw,
  search: lucideSearch,
  trash2: lucideTrash2,
  triangleAlert: lucideTriangleAlert,
  x: lucideX,
};

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
