import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import {
  afterLocalCapture,
  EMPTY_JOURNAL_DU_PUPITRE,
  EvenementDuJournal,
  EvenementsDuJournal,
  GesteDePointage,
  JournalDuPupitre,
  ReferentielDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { inject, Injectable } from '@angular/core';

const keyFor = (entreprise: Entreprise): string => `atelier-activites-v1:${entreprise.toString()}`;

const includeAcceptedPointages = (referentiel: ReferentielDuPupitre, journal: EvenementsDuJournal): ReferentielDuPupitre => ({
  ...referentiel,
  suivis: referentiel.suivis.map(suivi => ({
    ...suivi,
    evenements: [...new Set([...suivi.evenements, ...journal.acceptedPointageIds(suivi.id)])],
  })),
});

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
    return this.update(entreprise, current => {
      const journal = new EvenementsDuJournal(current.evenements);
      return {
        ...current,
        referentiel: includeAcceptedPointages(referentiel, journal),
      };
    });
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
