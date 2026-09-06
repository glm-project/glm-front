import {
  EMPTY_JOURNAL_DU_PUPITRE,
  EvenementDuJournal,
  GesteDAtelier,
  JournalDuPupitre,
  ReferentielDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';

const answerOnNextTask = (): Promise<void> => new Promise(resolve => setTimeout(resolve));

interface AppendBarrier {
  readonly started: Promise<void>;
  readonly release: () => void;
  signalStarted(): void;
  wait(): Promise<void>;
}

const appendBarrier = (): AppendBarrier => {
  let signalStarted: (() => void) | undefined;
  let release: (() => void) | undefined;
  const started = new Promise<void>(resolve => {
    signalStarted = resolve;
  });
  const waiting = new Promise<void>(resolve => {
    release = resolve;
  });
  if (signalStarted === undefined || release === undefined) throw new Error('Append barrier is not initialized.');
  return { started, signalStarted, release, wait: () => waiting };
};

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

export class JournauxDuPupitreFixture extends JournauxDuPupitrePort {
  private readonly entreprises = new Map<string, JournalDuPupitre>();
  private readonly tails = new Map<string, Promise<unknown>>();
  private nextAppendBarrier: AppendBarrier | undefined;
  private readsImmediately = false;
  failWrite = false;
  afterRead: (() => void) | undefined;

  override async read(entreprise: string): Promise<JournalDuPupitre> {
    if (!this.readsImmediately) await answerOnNextTask();
    const state = structuredClone(this.entreprises.get(entreprise) ?? EMPTY_JOURNAL_DU_PUPITRE);
    this.afterRead?.();
    this.afterRead = undefined;
    return state;
  }
  override async append(entreprise: string, gestes: readonly GesteDAtelier[]): Promise<void> {
    const barrier = this.nextAppendBarrier;
    this.nextAppendBarrier = undefined;
    barrier?.signalStarted();
    await barrier?.wait();
    await this.update(entreprise, state => ({
      ...state,
      evenements: [...state.evenements, ...gestes.map(geste => ({ geste, etat: 'EN_ATTENTE' as const }))],
    }));
  }
  override saveReferentiel(entreprise: string, referentiel: ReferentielDuPupitre): Promise<JournalDuPupitre> {
    return this.update(entreprise, state => ({ ...state, referentiel: includeAcceptedPointages(referentiel, state.evenements) }));
  }
  override saveResult(entreprise: string, resultat: EvenementDuJournal): Promise<JournalDuPupitre> {
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
  override markDisconnected(entreprise: string): Promise<JournalDuPupitre> {
    return this.update(entreprise, state => ({ ...state, connecte: false }));
  }
  override synchronize<T>(action: () => Promise<T>): Promise<T> {
    return this.lock('synchronisation', action);
  }
  override withSession<T>(action: () => Promise<T>): Promise<T> {
    return this.lock('session', action);
  }
  delayNextAppend(): { readonly started: Promise<void>; readonly release: () => void } {
    const barrier = appendBarrier();
    this.nextAppendBarrier = barrier;
    return { started: barrier.started, release: barrier.release };
  }
  seedReferentiel(entreprise: string, referentiel: ReferentielDuPupitre): void {
    this.entreprises.set(entreprise, { ...structuredClone(EMPTY_JOURNAL_DU_PUPITRE), referentiel: structuredClone(referentiel) });
  }
  answerReadsImmediately(): void {
    this.readsImmediately = true;
  }
  private async update(entreprise: string, change: (state: JournalDuPupitre) => JournalDuPupitre): Promise<JournalDuPupitre> {
    await answerOnNextTask();
    if (this.failWrite) {
      this.failWrite = false;
      throw new Error('disque plein');
    }
    const state = change(structuredClone(this.entreprises.get(entreprise) ?? EMPTY_JOURNAL_DU_PUPITRE));
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
