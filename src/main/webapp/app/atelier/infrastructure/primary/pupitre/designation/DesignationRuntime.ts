import { PupitreHorsLigne } from '@/app/atelier/application/PupitreHorsLigne';
import { effect, inject, Injectable, OnDestroy } from '@angular/core';

@Injectable()
export class DesignationRuntime implements OnDestroy {
  private readonly pupitre = inject(PupitreHorsLigne);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const deadline = this.pupitre.etatDesignation().deadline;
      clearTimeout(this.timer);
      if (deadline !== undefined) {
        this.timer = setTimeout(() => {
          void this.pupitre.expire();
        }, deadline - Date.now());
      }
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
    void this.pupitre.finish();
  }
}
