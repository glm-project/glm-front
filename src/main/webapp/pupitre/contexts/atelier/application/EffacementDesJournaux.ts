import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { EffacementDesJournauxPort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/EffacementDesJournauxPort';
import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import { EMPTY_JOURNAL_DU_PUPITRE, EvenementsDuJournal } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { inject, Injectable } from '@angular/core';
import { EtatHorsLigneDuPupitre } from './EtatHorsLigneDuPupitre';
import { GestesRecordingQueue } from './GestesRecordingQueue';

@Injectable()
export class EffacementDesJournaux {
  private readonly authentication = inject(AuthenticationPort);
  private readonly journaux = inject(JournauxDuPupitrePort);
  private readonly effacement = inject(EffacementDesJournauxPort);
  private readonly enregistrement = inject(GestesRecordingQueue);
  private readonly etatHorsLigne = inject(EtatHorsLigneDuPupitre);

  async pendingGestures(): Promise<number> {
    const entreprise = Entreprise.from(this.authentication.currentTenant());
    if (entreprise === undefined) return 0;
    const journal = await this.journaux.read(entreprise);
    return new EvenementsDuJournal(journal.evenements).pendingCount();
  }

  async discardAll(): Promise<void> {
    await this.enregistrement.drain();
    await this.journaux.synchronize(() => this.effacement.discardAll());
    this.etatHorsLigne.publish(EMPTY_JOURNAL_DU_PUPITRE);
  }
}
