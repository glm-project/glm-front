import {
  DesignationExpiration,
  DesignationExpirationSchedulerPort,
} from '@/pupitre/contexts/atelier/domain/designation/DesignationExpirationSchedulerPort';
import { Injectable } from '@angular/core';

@Injectable()
export class TimerDesignationExpirationScheduler extends DesignationExpirationSchedulerPort {
  private timer: ReturnType<typeof setTimeout> | undefined;

  override schedule(deadline: number | undefined, expiration: DesignationExpiration): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (deadline !== undefined) {
      this.timer = setTimeout(() => {
        expiration.expire();
      }, deadline - Date.now());
    }
  }
}
