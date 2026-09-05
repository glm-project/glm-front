import { ExpirationDesignation, PlanificationExpirationDesignationPort } from '@/app/atelier/domain/PlanificationExpirationDesignationPort';
import { Injectable } from '@angular/core';

@Injectable()
export class TimerPlanificationExpirationDesignation extends PlanificationExpirationDesignationPort {
  private timer: ReturnType<typeof setTimeout> | undefined;

  override schedule(deadline: number | undefined, expiration: ExpirationDesignation): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (deadline !== undefined) {
      this.timer = setTimeout(() => expiration.expire(), deadline - Date.now());
    }
  }
}
