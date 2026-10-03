import { Icon } from '@/app/shared/design-system/infrastructure/primary/icon/icon';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { afterNextRender, Component, ElementRef, inject, Injector, input, model, output, viewChild } from '@angular/core';

@Component({
  selector: 'glm-search-picker',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, Icon],
  templateUrl: './SearchPicker.html',
  styleUrl: './SearchPicker.css',
})
export class SearchPicker {
  readonly triggerId = input<string>();
  readonly triggerSelector = input.required<string>();
  readonly labelledBy = input.required<string>();
  readonly panelId = input.required<string>();
  readonly panelLabel = input.required<string>();
  readonly panelRole = input<'region' | 'dialog'>('region');
  readonly panelWidth = input('32rem');
  readonly panelMaxHeight = input('none');
  readonly searchLabel = input.required<string>();
  readonly searchSelector = input.required<string>();
  readonly disabled = input(false);
  readonly mutedPlaceholder = input(false);
  readonly focusAfterRender = input(false);
  readonly preventEscapeDefault = input(false);
  readonly opened = model(false);
  readonly search = model('');
  readonly detached = output();
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly searchField = viewChild<ElementRef<HTMLInputElement>>('searchField');
  private readonly injector = inject(Injector);

  close(): void {
    this.opened.set(false);
    this.trigger().nativeElement.focus();
  }

  protected open(): void {
    this.search.set('');
    this.opened.set(true);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.preventEscapeDefault()) {
        event.preventDefault();
      }
      this.close();
    }
  }

  protected focusSearch(): void {
    if (this.focusAfterRender()) {
      afterNextRender(
        () => {
          this.searchField()?.nativeElement.focus();
        },
        { injector: this.injector },
      );
    } else {
      this.searchField()?.nativeElement.focus();
    }
  }
}
