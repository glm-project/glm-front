import { EnrolmentRequirement } from '@/pupitre/shared/authentication/domain/DeviceAuthorizationPort';

export class EnrolmentRequirements {
  private required = false;
  private readonly waiters = new Map<symbol, (outcome: 'REQUIRED' | 'STOPPED') => void>();

  reset(): void {
    this.required = false;
  }

  request(): void {
    this.required = true;
    for (const waiting of this.waiters.keys()) {
      this.complete(waiting, 'REQUIRED');
    }
  }

  wait(): EnrolmentRequirement {
    const waiting = Symbol('authorization requirement');
    const outcome = new Promise<'REQUIRED' | 'STOPPED'>(resolve => {
      this.waiters.set(waiting, resolve);
      if (this.required) {
        this.complete(waiting, 'REQUIRED');
      }
    });
    return {
      outcome,
      stop: () => {
        this.complete(waiting, 'STOPPED');
      },
    };
  }

  private complete(waiting: symbol, outcome: 'REQUIRED' | 'STOPPED'): void {
    const resolve = this.waiters.get(waiting);
    this.waiters.delete(waiting);
    resolve?.(outcome);
  }
}
