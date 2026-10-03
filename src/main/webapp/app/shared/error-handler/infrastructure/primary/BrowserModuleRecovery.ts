import { DOCUMENT, inject, Injectable } from '@angular/core';

const RELOAD_ATTEMPT_KEY = 'glm:failed-module-reload';
const FAILED_IMPORT_MESSAGE =
  /^(Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed)/i;

@Injectable()
export class BrowserModuleRecovery {
  private readonly document = inject(DOCUMENT);

  recover(failure: unknown): void {
    if (!this.isFailedImport(failure)) return;
    this.reloadOnce();
  }

  private isFailedImport(failure: unknown): boolean {
    return failure instanceof Error && FAILED_IMPORT_MESSAGE.test(failure.message);
  }

  private reloadOnce(): void {
    const browser = this.document.defaultView;
    if (!browser) return;
    if (!browser.navigator.onLine) return;
    if (browser.sessionStorage.getItem(RELOAD_ATTEMPT_KEY) === import.meta.url) return;
    browser.sessionStorage.setItem(RELOAD_ATTEMPT_KEY, import.meta.url);
    browser.location.reload();
  }
}
