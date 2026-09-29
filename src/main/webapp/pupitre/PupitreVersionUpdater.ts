import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { CurrentOperateurLifecycle } from '@/pupitre/contexts/atelier/application/CurrentOperateurLifecycle';
import { GestesRecordingQueue } from '@/pupitre/contexts/atelier/application/GestesRecordingQueue';
import { ApplicationRef, DOCUMENT, inject, Injectable, OnDestroy } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter, merge, Subscription, take, timer } from 'rxjs';

const UPDATE_CHECK_INTERVAL_MS = 5 * 60_000;
const STARTUP_FALLBACK_MS = 30_000;

@Injectable()
export class PupitreVersionUpdater implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly application = inject(ApplicationRef);
  private readonly updates = inject(SwUpdate);
  private readonly designation = inject(CurrentOperateurLifecycle);
  private readonly recordings = inject(GestesRecordingQueue);
  private readonly errorHandler = inject(ErrorHandlerPort);
  private waitingForCaptures = false;
  private reloadInterval: ReturnType<typeof setInterval> | undefined;
  private checkInterval: ReturnType<typeof setInterval> | undefined;
  private readonly subscriptions = new Subscription();
  private readonly check = (): void => {
    if (!navigator.onLine) return;
    if (this.document.visibilityState !== 'visible') return;
    this.errorHandler.observe(this.updates.checkForUpdate().then(() => undefined));
  };
  private readonly checkOnReturn = (): void => {
    if (this.document.visibilityState === 'visible') this.check();
  };

  start(): void {
    if (!this.updates.isEnabled) return;
    this.subscriptions.add(
      this.updates.versionUpdates.subscribe(event => {
        if (event.type !== 'VERSION_READY') return;
        this.reloadInterval ??= setInterval(() => {
          this.reloadIfIdle();
        }, 1_000);
        this.reloadIfIdle();
      }),
    );
    this.subscriptions.add(
      merge(this.application.isStable.pipe(filter(Boolean)), timer(STARTUP_FALLBACK_MS))
        .pipe(take(1))
        .subscribe(() => {
          this.checkInterval = setInterval(this.check, UPDATE_CHECK_INTERVAL_MS);
          window.addEventListener('online', this.check);
          this.document.addEventListener('visibilitychange', this.checkOnReturn);
        }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    clearInterval(this.reloadInterval);
    clearInterval(this.checkInterval);
    window.removeEventListener('online', this.check);
    this.document.removeEventListener('visibilitychange', this.checkOnReturn);
  }

  private reloadIfIdle(): void {
    if (this.waitingForCaptures) return;
    if (this.designation.operateur() !== undefined) return;
    if (this.designation.code() !== '') return;
    this.waitingForCaptures = true;
    this.errorHandler.observe(this.reloadAfterCaptures());
  }

  private async reloadAfterCaptures(): Promise<void> {
    await this.recordings.drain();
    this.waitingForCaptures = false;
    if (this.designation.operateur() !== undefined) return;
    if (this.designation.code() !== '') return;
    clearInterval(this.reloadInterval);
    this.reloadInterval = undefined;
    this.document.location.reload();
  }
}
