import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import {
  EMPTY_JOURNAL_DU_PUPITRE,
  EvenementDuJournal,
  EvenementsDuJournal,
  GesteDAtelier,
  JournalDuPupitre,
  ReferentielDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';

const scheduleOnTheRealClock = globalThis.setTimeout.bind(globalThis);

const answerOnNextTask = (): Promise<void> => new Promise(resolve => scheduleOnTheRealClock(resolve));

interface AppendBarrier {
  readonly started: Promise<void>;
  readonly release: () => void;
  signalStarted(): void;
  wait(): Promise<void>;
}

const hasInitializedBarrier = (
  callbacks: Partial<Pick<AppendBarrier, 'signalStarted' | 'release'>>,
): callbacks is Pick<AppendBarrier, 'signalStarted' | 'release'> =>
  !(callbacks.signalStarted === undefined || callbacks.release === undefined);

const appendBarrier = (): AppendBarrier => {
  const callbacks: { signalStarted?: () => void; release?: () => void } = {};
  const started = new Promise<void>(resolve => {
    callbacks.signalStarted = resolve;
  });
  const waiting = new Promise<void>(resolve => {
    callbacks.release = resolve;
  });
  if (!hasInitializedBarrier(callbacks)) throw new Error('Append barrier is not initialized.');
  return { started, ...callbacks, wait: () => waiting };
};

const includeAcceptedPointages = (referentiel: ReferentielDuPupitre, evenements: readonly EvenementDuJournal[]): ReferentielDuPupitre => {
  const journal = new EvenementsDuJournal(evenements);
  return {
    ...referentiel,
    suivis: referentiel.suivis.map(suivi => ({
      ...suivi,
      evenements: [...new Set([...suivi.evenements, ...journal.acceptedPointageIds(suivi.id)])],
    })),
  };
};

export class JournauxDuPupitreFixture extends JournauxDuPupitrePort {
  private readonly entreprises = new Map<string, JournalDuPupitre>();

  private readonly tails = new Map<string, Promise<unknown>>();
  private nextAppendBarrier: AppendBarrier | undefined;
  private readsImmediately = false;
  failWrite = false;
  afterRead: (() => void) | undefined;

  override async read(entreprise: Entreprise): Promise<JournalDuPupitre> {
    if (!this.readsImmediately) await answerOnNextTask();
    const state = structuredClone(this.entreprises.get(entreprise.toString()) ?? EMPTY_JOURNAL_DU_PUPITRE);
    this.afterRead?.();
    this.afterRead = undefined;
    return state;
  }
  override async append(entreprise: Entreprise, gestes: readonly GesteDAtelier[]): Promise<void> {
    const barrier = this.nextAppendBarrier;
    this.nextAppendBarrier = undefined;
    barrier?.signalStarted();
    await barrier?.wait();
    await this.update(entreprise, state => ({
      ...state,
      evenements: [...state.evenements, ...gestes.map(geste => ({ geste, etat: 'EN_ATTENTE' as const }))],
    }));
  }
  override saveReferentiel(entreprise: Entreprise, referentiel: ReferentielDuPupitre): Promise<JournalDuPupitre> {
    return this.update(entreprise, state => ({ ...state, referentiel: includeAcceptedPointages(referentiel, state.evenements) }));
  }
  override saveResult(entreprise: Entreprise, resultat: EvenementDuJournal): Promise<JournalDuPupitre> {
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
  override markDisconnected(entreprise: Entreprise): Promise<JournalDuPupitre> {
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
  seedReferentiel(entreprise: Entreprise, referentiel: ReferentielDuPupitre): void {
    this.entreprises.set(entreprise.toString(), {
      ...structuredClone(EMPTY_JOURNAL_DU_PUPITRE),
      referentiel: structuredClone(referentiel),
    });
  }
  seedJournal(entreprise: Entreprise, journal: JournalDuPupitre): void {
    this.entreprises.set(entreprise.toString(), structuredClone(journal));
  }
  answerReadsImmediately(): void {
    this.readsImmediately = true;
  }
  private async update(entreprise: Entreprise, change: (state: JournalDuPupitre) => JournalDuPupitre): Promise<JournalDuPupitre> {
    await answerOnNextTask();
    if (this.failWrite) {
      this.failWrite = false;
      throw new Error('disque plein');
    }
    const state = change(structuredClone(this.entreprises.get(entreprise.toString()) ?? EMPTY_JOURNAL_DU_PUPITRE));
    this.entreprises.set(entreprise.toString(), structuredClone(state));
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
