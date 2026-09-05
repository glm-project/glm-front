import {
  EMPTY_PUPITRE,
  LocalEvent,
  LocalGeste,
  LocalPupitreState,
  ReferentielDuPupitre,
} from '@/pupitre/contexts/atelier/domain/LocalPupitreState';
import { PupitreJournalPort } from '@/pupitre/contexts/atelier/domain/PupitreJournalPort';

const roundTrip = (): Promise<void> => new Promise(resolve => setTimeout(resolve));

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

export class PupitreJournalFixture extends PupitreJournalPort {
  private readonly entreprises = new Map<string, LocalPupitreState>();
  private readonly tails = new Map<string, Promise<unknown>>();
  failWrite = false;
  afterRead: (() => void) | undefined;

  override async read(entreprise: string): Promise<LocalPupitreState> {
    await roundTrip();
    const state = structuredClone(this.entreprises.get(entreprise) ?? EMPTY_PUPITRE);
    this.afterRead?.();
    this.afterRead = undefined;
    return state;
  }
  override async append(entreprise: string, gestes: LocalGeste[]): Promise<void> {
    await this.update(entreprise, state => ({
      ...state,
      evenements: [...state.evenements, ...gestes.map(geste => ({ geste, etat: 'EN_ATTENTE' as const }))],
    }));
  }
  override saveReferentiel(entreprise: string, referentiel: ReferentielDuPupitre): Promise<LocalPupitreState> {
    return this.update(entreprise, state => ({ ...state, referentiel: includeAcceptedPointages(referentiel, state.evenements) }));
  }
  override saveResult(entreprise: string, resultat: LocalEvent): Promise<LocalPupitreState> {
    return this.update(entreprise, state => ({
      ...state,
      connecte: true,
      evenements: state.evenements.map(evenement => {
        if (evenement.geste.id === resultat.geste.id) {
          return resultat;
        }
        return evenement;
      }),
    }));
  }
  override markDisconnected(entreprise: string): Promise<LocalPupitreState> {
    return this.update(entreprise, state => ({ ...state, connecte: false }));
  }
  override synchronize<T>(action: () => Promise<T>): Promise<T> {
    return this.lock('synchronisation', action);
  }
  override withSession<T>(action: () => Promise<T>): Promise<T> {
    return this.lock('session', action);
  }
  private async update(entreprise: string, change: (state: LocalPupitreState) => LocalPupitreState): Promise<LocalPupitreState> {
    await roundTrip();
    if (this.failWrite) {
      this.failWrite = false;
      throw new Error('disque plein');
    }
    const state = change(structuredClone(this.entreprises.get(entreprise) ?? EMPTY_PUPITRE));
    this.entreprises.set(entreprise, structuredClone(state));
    return state;
  }
  private lock<T>(key: string, action: () => Promise<T>): Promise<T> {
    const locked = (this.tails.get(key) ?? Promise.resolve()).then(action);
    this.tails.set(
      key,
      locked.catch(() => undefined),
    );
    return locked;
  }
}
