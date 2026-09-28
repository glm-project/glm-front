import { Directive, ElementRef, inject, input, OnDestroy, output, signal } from '@angular/core';

@Directive({
  selector: '[glmLongPress]',
  host: {
    '[class.long-press--holding]': 'holding()',
    '[style.--long-press-duration.ms]': 'durationMs()',
    '(pointerdown)': 'hold()',
    '(pointerup)': 'release()',
    '(pointerleave)': 'release()',
    '(pointercancel)': 'release()',
    '(contextmenu)': '$event.preventDefault()',
  },
})
export class LongPress implements OnDestroy {
  readonly durationMs = input.required<number>({ alias: 'glmLongPress' });
  readonly longPressed = output();
  protected readonly holding = signal(false);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private pending: ReturnType<typeof setTimeout> | undefined;

  ngOnDestroy(): void {
    this.release();
  }

  protected hold(): void {
    this.release();
    if (this.isUnavailable()) return;
    this.holding.set(true);
    this.pending = setTimeout(() => {
      this.complete();
    }, this.durationMs());
  }

  protected release(): void {
    clearTimeout(this.pending);
    this.holding.set(false);
  }

  private complete(): void {
    this.holding.set(false);
    if (this.isUnavailable()) return;
    this.longPressed.emit();
  }

  private isUnavailable(): boolean {
    return this.element.nativeElement.matches(':disabled');
  }
}
