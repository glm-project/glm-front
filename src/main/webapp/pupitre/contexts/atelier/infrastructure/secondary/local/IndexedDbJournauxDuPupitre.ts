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
import { keyFor } from '@/pupitre/contexts/atelier/infrastructure/secondary/local/ClesDesJournaux';
import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { inject, Injectable } from '@angular/core';

@Injectable()
export class IndexedDbJournauxDuPupitre extends JournauxDuPupitrePort {
  private readonly stockage = inject(LocalStoragePort);

  override async read(entreprise: Entreprise): Promise<JournalDuPupitre> {
    await this.stockage.discardDocumentsWithPrefix('atelier:');
    const stored = await this.stockage.read<JournalDuPupitre>(keyFor(entreprise));
    return stored === undefined ? EMPTY_JOURNAL_DU_PUPITRE : stored;
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

  private async update(entreprise: Entreprise, change: (current: JournalDuPupitre) => JournalDuPupitre): Promise<JournalDuPupitre> {
    await this.stockage.discardDocumentsWithPrefix('atelier:');
    return this.stockage.update<JournalDuPupitre>(keyFor(entreprise), EMPTY_JOURNAL_DU_PUPITRE, change);
  }
}
