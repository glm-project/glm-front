import { EffacementDesJournauxPort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/EffacementDesJournauxPort';
import { PREFIXE_DES_JOURNAUX } from '@/pupitre/contexts/atelier/infrastructure/secondary/local/ClesDesJournaux';
import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { inject, Injectable } from '@angular/core';

@Injectable()
export class IndexedDbEffacementDesJournaux extends EffacementDesJournauxPort {
  private readonly stockage = inject(LocalStoragePort);

  override discardAll(): Promise<void> {
    return this.stockage.discardDocumentsWithPrefix(PREFIXE_DES_JOURNAUX);
  }
}
