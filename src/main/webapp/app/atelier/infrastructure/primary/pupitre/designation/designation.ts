import { afterRenderEffect, Component, ElementRef, inject } from '@angular/core';
import { DesignationDuPupitre } from './DesignationDuPupitre';

@Component({
  selector: 'glm-designation',
  templateUrl: './designation.html',
  host: {
    'data-selector': 'designation',
    class: 'block h-full',
    '(pointerdown)': 'onPress($event)',
    '(document:keydown)': 'onKey($event)',
  },
})
export class Designation {
  readonly designation = inject(DesignationDuPupitre);
  readonly digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private consumedPress = false;

  constructor() {
    afterRenderEffect(() => {
      this.designation.code();
      const display = this.host.nativeElement.querySelector<HTMLElement>('[data-selector="code"]')!;
      display.scrollLeft = display.scrollWidth;
    });
  }

  onPress(event: PointerEvent): void {
    this.consumedPress = !this.designation.registerPress();
    if (this.consumedPress) event.preventDefault();
  }

  onTouch(event: PointerEvent, command: string): void {
    event.stopPropagation();
    this.onPress(event);
    this.onClick(command);
    this.consumedPress = true;
  }

  onKey(event: KeyboardEvent): void {
    if (event.repeat) {
      event.preventDefault();
      return;
    }
    if (/^[0-9]$/.test(event.key) || event.key === 'Backspace' || event.key === 'Enter') {
      event.preventDefault();
      this.execute(event.key);
    }
  }

  onClick(command: string): void {
    if (this.consumedPress) {
      this.consumedPress = false;
      return;
    }
    this.execute(command);
  }

  private execute(command: string): void {
    if (command === 'Enter') {
      void this.designation.validate();
    } else if (command === 'Backspace') {
      this.designation.erase();
    } else {
      this.designation.enterDigit(command);
    }
  }
}
