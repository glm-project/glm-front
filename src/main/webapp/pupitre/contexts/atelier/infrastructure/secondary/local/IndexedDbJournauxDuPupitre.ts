import {
  EMPTY_JOURNAL_DU_PUPITRE,
  EvenementDuJournal,
  GesteDAtelier,
  JournalDuPupitre,
  ReferentielDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { inject, Injectable } from '@angular/core';

const keyFor = (entreprise: string): string => `atelier:${entreprise}`;

const acceptedPointageIdsFor = (suiviId: string, evenements: readonly EvenementDuJournal[]): string[] =>
  evenements
    .filter(evenement => evenement.etat === 'ACCEPTE' && evenement.geste.nature === 'POINTAGE' && evenement.geste.suiviId === suiviId)
    .map(evenement => evenement.geste.id);

const includeAcceptedPointages = (referentiel: ReferentielDuPupitre, evenements: readonly EvenementDuJournal[]): ReferentielDuPupitre => ({
  ...referentiel,
  suivis: referentiel.suivis.map(suivi => ({
    ...suivi,
    evenements: [...new Set([...suivi.evenements, ...acceptedPointageIdsFor(suivi.id, evenements)])],
  })),
});

@Injectable()
export class IndexedDbJournauxDuPupitre extends JournauxDuPupitrePort {
  private readonly stockage = inject(LocalStoragePort);

  override async read(entreprise: string): Promise<JournalDuPupitre> {
    return (await this.stockage.read<JournalDuPupitre>(keyFor(entreprise))) ?? EMPTY_JOURNAL_DU_PUPITRE;
  }

  override async append(entreprise: string, gestes: readonly GesteDAtelier[]): Promise<void> {
    await this.stockage.update<JournalDuPupitre>(keyFor(entreprise), EMPTY_JOURNAL_DU_PUPITRE, current => ({
      ...current,
      evenements: [...current.evenements, ...gestes.map(geste => ({ geste, etat: 'EN_ATTENTE' as const }))],
    }));
  }

  override saveReferentiel(entreprise: string, referentiel: ReferentielDuPupitre): Promise<JournalDuPupitre> {
    return this.stockage.update<JournalDuPupitre>(keyFor(entreprise), EMPTY_JOURNAL_DU_PUPITRE, current => ({
      ...current,
      referentiel: includeAcceptedPointages(referentiel, current.evenements),
    }));
  }

  override saveResult(entreprise: string, resultat: EvenementDuJournal): Promise<JournalDuPupitre> {
    return this.stockage.update<JournalDuPupitre>(keyFor(entreprise), EMPTY_JOURNAL_DU_PUPITRE, current => ({
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

  override markDisconnected(entreprise: string): Promise<JournalDuPupitre> {
    return this.stockage.update<JournalDuPupitre>(keyFor(entreprise), EMPTY_JOURNAL_DU_PUPITRE, current => ({
      ...current,
      connecte: false,
    }));
  }

  override synchronize<T>(action: () => Promise<T>): Promise<T> {
    return this.stockage.lock('synchronisation', action);
  }

  override withSession<T>(action: () => Promise<T>): Promise<T> {
    return this.stockage.lock('session', action);
  }
}
