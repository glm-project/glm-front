import { DestroyRef, DOCUMENT, inject } from '@angular/core';

export class SupervisionRefreshCycle {
  private readonly document = inject(DOCUMENT);
  private refreshOnReturnRequested = false;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly reload: () => boolean) {
    this.startPolling();
    this.observeVisibility();
  }

  async run<T>(read: () => Promise<T>): Promise<T> {
    this.refreshOnReturnRequested = false;
    try {
      const result = await read();
      if (!this.shouldReadAgain()) {
        return result;
      }
    } catch (error) {
      if (!this.shouldReadAgain()) {
        throw error;
      }
    }
    return this.run(read);
  }

  private observeVisibility(): void {
    const visibilityChanged = (): void => {
      this.refreshOnVisibilityChange();
    };
    this.document.addEventListener('visibilitychange', visibilityChanged);
    inject(DestroyRef).onDestroy(() => {
      this.suspend();
      this.document.removeEventListener('visibilitychange', visibilityChanged);
    });
  }

  private refreshOnVisibilityChange(): void {
    this.suspend();
    if (this.document.visibilityState === 'visible') {
      this.resume();
    }
  }

  private suspend(): void {
    this.refreshOnReturnRequested = false;
    clearInterval(this.timer);
  }

  private resume(): void {
    if (!this.reload()) {
      this.refreshOnReturnRequested = true;
    }
    this.startPolling();
  }

  private startPolling(): void {
    if (this.document.visibilityState === 'visible') {
      this.timer = setInterval(() => this.reload(), 30_000);
    }
  }

  private shouldReadAgain(): boolean {
    return this.refreshOnReturnRequested;
  }
}
