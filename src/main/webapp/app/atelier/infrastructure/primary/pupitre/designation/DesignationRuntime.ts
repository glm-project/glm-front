import { PupitreHorsLigne } from '@/app/atelier/application/PupitreHorsLigne';
import { inject, Injectable, OnDestroy } from '@angular/core';

@Injectable()
export class DesignationRuntime implements OnDestroy {
  private readonly pupitre = inject(PupitreHorsLigne);
  ngOnDestroy(): void {
    void this.pupitre.finish();
  }
}
