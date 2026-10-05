import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { TypeScriptEffacementDesJournaux } from '@/pupitre/contexts/atelier/infrastructure/primary/TypeScriptEffacementDesJournaux';
import { JournauxDeLAtelierPort } from '@/pupitre/contexts/enrolement/domain/JournauxDeLAtelierPort';
import { inject, Injectable } from '@angular/core';

@Injectable()
export class AtelierJournaux extends JournauxDeLAtelierPort {
  private readonly atelier = inject(TypeScriptEffacementDesJournaux);
  private readonly errorHandler = inject(ErrorHandlerPort);

  override pendingGestures(): Promise<number> {
    return this.atelier.pendingGestures();
  }

  override discardAll(): Promise<void> {
    return this.atelier.discardAll().catch((failure: unknown) => {
      this.errorHandler.handleError(failure);
    });
  }
}
