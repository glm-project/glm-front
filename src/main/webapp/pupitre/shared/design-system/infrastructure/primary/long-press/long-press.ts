import { Directive, input, OnDestroy, output } from '@angular/core';

@Directive({
  selector: '[glmLongPress]',
  host: {
    '(pointerdown)': 'hold()',
    '(pointerup)': 'release()',
    '(pointerleave)': 'release()',
    '(pointercancel)': 'release()',
  },
})
export class LongPress implements OnDestroy {
  readonly durationMs = input.required<number>({ alias: 'glmLongPress' });
  readonly longPressed = output();
  private pending: ReturnType<typeof setTimeout> | undefined;

  ngOnDestroy(): void {
    this.release();
  }

  protected hold(): void {
    this.release();
    this.pending = setTimeout(() => {
      this.longPressed.emit();
    }, this.durationMs());
  }

  protected release(): void {
    clearTimeout(this.pending);
  }
}
