import { afterActivatingReferentiel } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/ActivationDuReferentiel';
import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import {
  afterLocalCapture,
  EMPTY_JOURNAL_DU_PUPITRE,
  EvenementDuJournal,
  GesteDePointage,
  JournalDuPupitre,
  ReferentielDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { keyFor, PREFIXES_DES_JOURNAUX_OBSOLETES } from '@/pupitre/contexts/atelier/infrastructure/secondary/local/ClesDesJournaux';
import { JournalStocke, toJournalDuPupitre } from '@/pupitre/contexts/atelier/infrastructure/secondary/local/JournalStocke';
import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { inject, Injectable } from '@angular/core';

@Injectable()
export class IndexedDbJournauxDuPupitre extends JournauxDuPupitrePort {
  private readonly stockage = inject(LocalStoragePort);

  override async read(entreprise: Entreprise): Promise<JournalDuPupitre> {
    await this.discardObsoleteJournals();
    const stored = await this.stockage.read<JournalStocke>(keyFor(entreprise));
    return stored === undefined ? EMPTY_JOURNAL_DU_PUPITRE : toJournalDuPupitre(stored);
  }

  override async append(entreprise: Entreprise, gestes: readonly GesteDePointage[], repriseAEffacer?: string): Promise<void> {
    await this.update(entreprise, current => afterLocalCapture(current, gestes, repriseAEffacer));
  }

  override saveReferentiel(entreprise: Entreprise, referentiel: ReferentielDuPupitre): Promise<JournalDuPupitre> {
    return this.update(entreprise, current => afterActivatingReferentiel(current, referentiel));
  }

  override saveResult(entreprise: Entreprise, resultat: EvenementDuJournal): Promise<JournalDuPupitre> {
    return this.update(entreprise, current => ({
      ...current,
      connecte: true,
      evenements: current.evenements.map(candidate => {
        if (candidate.geste.id === resultat.geste.id) {
          return resultat;
        }
        return candidate;
      }),
    }));
  }

  override markDisconnected(entreprise: Entreprise): Promise<JournalDuPupitre> {
    return this.update(entreprise, current => ({
      ...current,
      connecte: false,
    }));
  }

  override synchronize<T>(action: () => Promise<T>): Promise<T> {
    return this.stockage.lock('synchronisation', action);
  }

  private async discardObsoleteJournals(): Promise<void> {
    for (const prefixe of PREFIXES_DES_JOURNAUX_OBSOLETES) {
      await this.stockage.discardDocumentsWithPrefix(prefixe);
    }
  }

  private async update(entreprise: Entreprise, change: (current: JournalDuPupitre) => JournalDuPupitre): Promise<JournalDuPupitre> {
    await this.discardObsoleteJournals();
    const stored = await this.stockage.update<JournalStocke>(keyFor(entreprise), EMPTY_JOURNAL_DU_PUPITRE, current =>
      change(toJournalDuPupitre(current)),
    );
    return toJournalDuPupitre(stored);
  }
}
