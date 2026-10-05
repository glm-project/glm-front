import { EffacementDesJournaux } from '@/pupitre/contexts/atelier/application/EffacementDesJournaux';
import { inject, Injectable } from '@angular/core';

@Injectable()
export class TypeScriptEffacementDesJournaux {
  private readonly effacement = inject(EffacementDesJournaux);

  pendingGestures(): Promise<number> {
    return this.effacement.pendingGestures();
  }

  discardAll(): Promise<void> {
    return this.effacement.discardAll();
  }
}
