import {
  EMPTY_PUPITRE,
  LocalEvent,
  LocalGeste,
  LocalPupitreState,
  ReferentielDuPupitre,
} from '@/pupitre/contexts/atelier/domain/LocalPupitreState';
import { PupitreJournalPort } from '@/pupitre/contexts/atelier/domain/PupitreJournalPort';
import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { inject, Injectable } from '@angular/core';

const keyFor = (entreprise: string): string => `atelier:${entreprise}`;

const acceptedPointageIdsFor = (suiviId: string, evenements: LocalEvent[]): string[] =>
  evenements
    .filter(evenement => evenement.etat === 'ACCEPTE' && evenement.geste.nature === 'POINTAGE' && evenement.geste.suiviId === suiviId)
    .map(evenement => evenement.geste.id);

const includeAcceptedPointages = (referentiel: ReferentielDuPupitre, evenements: LocalEvent[]): ReferentielDuPupitre => ({
  ...referentiel,
  suivis: referentiel.suivis.map(suivi => ({
    ...suivi,
    evenements: [...new Set([...suivi.evenements, ...acceptedPointageIdsFor(suivi.id, evenements)])],
  })),
});

@Injectable()
export class LocalPupitreJournal extends PupitreJournalPort {
  private readonly stockage = inject(LocalStoragePort);

  override async read(entreprise: string): Promise<LocalPupitreState> {
    return (await this.stockage.read<LocalPupitreState>(keyFor(entreprise))) ?? EMPTY_PUPITRE;
  }

  override async append(entreprise: string, gestes: LocalGeste[]): Promise<void> {
    await this.stockage.update<LocalPupitreState>(keyFor(entreprise), EMPTY_PUPITRE, current => ({
      ...current,
      evenements: [...current.evenements, ...gestes.map(geste => ({ geste, etat: 'EN_ATTENTE' as const }))],
    }));
  }

  override saveReferentiel(entreprise: string, referentiel: ReferentielDuPupitre): Promise<LocalPupitreState> {
    return this.stockage.update<LocalPupitreState>(keyFor(entreprise), EMPTY_PUPITRE, current => ({
      ...current,
      referentiel: includeAcceptedPointages(referentiel, current.evenements),
    }));
  }

  override saveResult(entreprise: string, resultat: LocalEvent): Promise<LocalPupitreState> {
    return this.stockage.update<LocalPupitreState>(keyFor(entreprise), EMPTY_PUPITRE, current => ({
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

  override markDisconnected(entreprise: string): Promise<LocalPupitreState> {
    return this.stockage.update<LocalPupitreState>(keyFor(entreprise), EMPTY_PUPITRE, current => ({ ...current, connecte: false }));
  }

  override synchronize<T>(action: () => Promise<T>): Promise<T> {
    return this.stockage.lock('synchronisation', action);
  }

  override withSession<T>(action: () => Promise<T>): Promise<T> {
    return this.stockage.lock('session', action);
  }
}
