import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { CurrentOperateurLifecycle } from '@/pupitre/contexts/atelier/application/CurrentOperateurLifecycle';
import { ActiviteExpirationSchedulerPort } from '@/pupitre/contexts/atelier/domain/designation/ActiviteExpirationSchedulerPort';
import { DesignationExpirationSchedulerPort } from '@/pupitre/contexts/atelier/domain/designation/DesignationExpirationSchedulerPort';
import { IdentiteOperateurDesigne } from '@/pupitre/contexts/atelier/domain/designation/fenetre-operateur/OperateurDesigne';
import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import {
  EMPTY_JOURNAL_DU_PUPITRE,
  EvenementDuJournal,
  GesteDePointage,
  JournalDuPupitre,
  ReferentielDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { CodeDeRefusDAtelier, CODES_DE_REFUS_D_ATELIER, MotifDeRefus } from '@/pupitre/contexts/atelier/domain/refus/MotifDeRefus';
import { RefusDePublication } from '@/pupitre/contexts/atelier/domain/refus/RefusDePublication';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { err, ok, Result } from '@/pupitre/contexts/atelier/domain/synchronisation/Result';
import { DeviceSessionPort } from '@/pupitre/shared/authentication/domain/DeviceSessionPort';
import { Injector } from '@angular/core';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { dureeMaximaleFixtureEnMs } from '@test/unit/fixtures/pupitre/atelier/DureeMaximaleFixture';
import { identifiantFixture } from '@test/unit/fixtures/pupitre/atelier/IdentifiantFixture';
import { JournauxDuPupitreFixture } from '@test/unit/fixtures/pupitre/atelier/JournauxDuPupitreFixture';
import { elementsDeLaZoneFixture } from '@test/unit/fixtures/pupitre/atelier/VueDePointageFixture';
import { DeviceSessionFixture } from '@test/unit/fixtures/pupitre/DeviceSessionFixture';
import { SignalFixture } from '@test/unit/fixtures/SignalFixture';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { MockInstance, vi } from 'vitest';
import { AtelierCoordinator } from './AtelierCoordinator';
import { EtatHorsLigneDuPupitre } from './EtatHorsLigneDuPupitre';
import { FraicheurDuReferentiel } from './FraicheurDuReferentiel';
import { GestesRecordingQueue } from './GestesRecordingQueue';
import { PupitreSynchronization } from './PupitreSynchronization';

const roundTrip = (): Promise<void> => new Promise(resolve => setTimeout(resolve));
const referenceFixture: ReferentielDuPupitre = {
  operateurs: [
    {
      id: 'jean',
      nom: 'Dupont',
      prenom: 'Jean',
      identifiant: '049',
      postes: [{ id: 'tour', libelle: 'Tour' }],
    },
  ],
  suivis: [{ id: 'piece', nom: 'OF-1', categorie: 'MOULE', etat: 'EN_ATTENTE', activites: [], evenements: [] }],
  categories: [],
  dureeMaximaleDActiviteEnMs: dureeMaximaleFixtureEnMs,
};
const ouvertureFixture: GesteDePointage = {
  nature: 'POINTAGE',
  id: 'arrivee',
  dateDeSurvenue: '2026-09-05T08:00:00Z',
  operateurId: 'jean',
  suiviId: 'piece',
  type: 'DEBUT',
};
const identityRootFixture = '11111111-1111-4111-8111-111111111111';
const futureIdentityRootFixture = '22222222-2222-4222-8222-222222222222';
const refusalFixture = (code: string): RefusDePublication =>
  new RefusDePublication(
    `urn:glm:erreur:atelier:${code}`,
    'cause conservee',
    MotifDeRefus.from(CODES_DE_REFUS_D_ATELIER.find(candidate => candidate === code)),
  );

interface SynchronizationBarrier {
  readonly started: Promise<void>;
  readonly release: () => void;
  signalStarted(): void;
  wait(): Promise<void>;
}

const hasInitializedBarrier = (
  callbacks: Partial<Pick<SynchronizationBarrier, 'signalStarted' | 'release'>>,
): callbacks is Pick<SynchronizationBarrier, 'signalStarted' | 'release'> =>
  !(callbacks.signalStarted === undefined || callbacks.release === undefined);

const synchronizationBarrier = (): SynchronizationBarrier => {
  const callbacks: { signalStarted?: () => void; release?: () => void } = {};
  const started = new Promise<void>(resolve => {
    callbacks.signalStarted = resolve;
  });
  const waiting = new Promise<void>(resolve => {
    callbacks.release = resolve;
  });
  if (!hasInitializedBarrier(callbacks)) throw new Error('Synchronization barrier is not initialized.');
  return { started, ...callbacks, wait: () => waiting };
};

const haveComparableDeadlines = (initial: number | undefined, renewed: number | undefined): initial is number =>
  initial !== undefined && renewed !== undefined;

class AuthenticationFixture extends AuthenticationPort {
  tenant: string | undefined = 'entreprise-a';
  token: string | undefined;
  pendingSynchronization: Promise<void> | undefined;
  private nextSynchronizationBarrier: SynchronizationBarrier | undefined;

  override async synchronizeSession(): Promise<void> {
    await roundTrip();
    const barrier = this.nextSynchronizationBarrier;
    this.nextSynchronizationBarrier = undefined;
    barrier?.signalStarted();
    await barrier?.wait();
    await this.pendingSynchronization;
  }
  override async authenticate(): Promise<void> {
    await roundTrip();
  }
  override currentToken(): string | undefined {
    return this.token;
  }
  override currentTenant(): string | undefined {
    return this.tenant;
  }
  override logout(): void {
    this.token = undefined;
  }
  delayNextSynchronization(): { readonly started: Promise<void>; readonly release: () => void } {
    const barrier = synchronizationBarrier();
    this.nextSynchronizationBarrier = barrier;
    return { started: barrier.started, release: barrier.release };
  }
}

class DesignationExpirationSchedulerFixture extends DesignationExpirationSchedulerPort {
  readonly scheduledDeadlines: (number | undefined)[] = [];

  override schedule(deadline?: number): void {
    this.scheduledDeadlines.push(deadline);
  }
}

class ApplicationJournalFixture extends JournauxDuPupitrePort {
  private readonly stored = new JournauxDuPupitreFixture();
  private nextAcknowledgement: SignalFixture | undefined;
  override saveReferentiel(entreprise: Entreprise, reference: ReferentielDuPupitre): Promise<JournalDuPupitre> {
    return this.stored.saveReferentiel(entreprise, reference);
  }
  override async saveResult(entreprise: Entreprise, result: EvenementDuJournal): Promise<JournalDuPupitre> {
    const saved = await this.stored.saveResult(entreprise, result);
    this.nextAcknowledgement?.release();
    this.nextAcknowledgement = undefined;
    return saved;
  }
  waitForNextAcknowledgement(): Promise<void> {
    this.nextAcknowledgement = new SignalFixture();
    return this.nextAcknowledgement.promise;
  }
  override markDisconnected(entreprise: Entreprise): Promise<JournalDuPupitre> {
    return this.stored.markDisconnected(entreprise);
  }
  override synchronize<T>(action: () => Promise<T>): Promise<T> {
    return this.stored.synchronize(action);
  }
  synchronizationsSettled(): Promise<void> {
    return this.stored.synchronizationsSettled();
  }

  override read(entreprise: Entreprise): Promise<JournalDuPupitre> {
    return this.stored.read(entreprise);
  }
  delayNextAppend(): ReturnType<JournauxDuPupitreFixture['delayNextAppend']> {
    return this.stored.delayNextAppend();
  }
  set failWrite(value: boolean) {
    this.stored.failWrite = value;
  }
  set afterRead(value: (() => void) | undefined) {
    this.stored.afterRead = value;
  }

  readonly acceptedBatches: string[][] = [];

  override async append(entreprise: Entreprise, gestes: readonly GesteDePointage[], repriseAEffacer?: string): Promise<void> {
    await this.stored.append(entreprise, gestes, repriseAEffacer);
    this.acceptedBatches.push(gestes.map(geste => `${geste.type}:${geste.suiviId}:${geste.posteId ?? 'SANS_POSTE'}`));
  }
}

class ServerFixture extends AtelierExchangePort {
  reference = structuredClone(referenceFixture);
  failures: (Error | undefined)[] = [];
  cacheFailure: Error | undefined;
  readonly journal: GesteDePointage[] = [];
  readonly chronology: string[] = [];
  beforeSend: (() => void) | undefined;
  afterReread: (() => void) | undefined;
  afterReference: (() => void) | undefined;

  override async referentiel(): Promise<ReferentielDuPupitre> {
    await roundTrip();
    this.afterReference?.();
    if (this.cacheFailure !== undefined) {
      throw this.cacheFailure;
    }
    return this.reference;
  }
  override async send(geste: GesteDePointage): Promise<Result<void, RefusDePublication>> {
    await roundTrip();
    this.chronology.push(geste.id);
    this.beforeSend?.();
    this.beforeSend = undefined;
    const failure = this.failures.shift();
    if (failure instanceof RefusDePublication) {
      return err(failure);
    }
    if (failure !== undefined) {
      throw failure;
    }
    this.journal.push(structuredClone(geste));
    return ok(undefined);
  }
  override async reread(): Promise<void> {
    await roundTrip();
    this.chronology.push('relecture');
    this.afterReread?.();
  }
}

describe('AtelierCoordinator', () => {
  let pupitre: AtelierCoordinator;
  let designation: CurrentOperateurLifecycle;
  let etatHorsLigne: EtatHorsLigneDuPupitre;
  let journal: ApplicationJournalFixture;
  let serveur: ServerFixture;
  let authentication: AuthenticationFixture;
  let scheduler: DesignationExpirationSchedulerFixture;
  let errorHandler: ErrorHandlerFixture;

  beforeEach(async () => {
    givenBusinessTime();
    errorHandler = new ErrorHandlerFixture();
    scheduler = new DesignationExpirationSchedulerFixture();
    journal = new ApplicationJournalFixture();
    serveur = new ServerFixture();
    authentication = new AuthenticationFixture();
    await givenCachedReference(referenceFixture);
    pupitre = buildPupitre();
  });

  afterEach(async () => {
    await pupitre.synchronize();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should resolve an operator locally after a restart without a network', async () => {
    await givenWorkStartedOffline();

    await whenRestarting();
    await whenOpening();

    thenActivityIs('TRAVAIL');
    await thenQueueHas(1);
  });

  it('should commit only the activity gestures in local business order, an opening on the busy key staying without local effect', async () => {
    await givenAnOpenWindow();

    await whenStartingAndReportingNonConformity();

    await thenNatureOrderIs(['POINTAGE', 'POINTAGE']);
    thenActivityIs('TRAVAIL');
    await thenQueueHasUniqueStableIdentities();
  });

  it('should send the finish of the work before the non conformity, both at the same time', async () => {
    await givenWorkStartedOffline();
    givenAuthorizedAccess();
    whenBusinessTimeBecomes('2026-09-05T08:00:01Z');

    await whenPointingAt('piece', 'SECONDAIRE');
    await whenSynchronizing();

    thenTheServerReceived(['DEBUT@2026-09-05T08:00:00.000Z', 'FIN@2026-09-05T08:00:01.000Z', 'NON_CONFORMITE@2026-09-05T08:00:01.000Z']);
  });

  it('should send the finish of the non conformity before the work, both at the same time', async () => {
    await givenNonConformityReportedDuringWork();
    givenAuthorizedAccess();
    whenBusinessTimeBecomes('2026-09-05T08:00:02Z');

    await whenPointingAt('piece', 'SECONDAIRE');
    await whenSynchronizing();

    thenTheServerReceived([
      'DEBUT@2026-09-05T08:00:00.000Z',
      'FIN@2026-09-05T08:00:01.000Z',
      'NON_CONFORMITE@2026-09-05T08:00:01.000Z',
      'FIN@2026-09-05T08:00:02.000Z',
      'DEBUT@2026-09-05T08:00:02.000Z',
    ]);
  });

  it('should retain two simultaneous tile captures in acquisition order and stop the activity the second one left open', async () => {
    await givenTwoActiveWorkstations();
    givenSequentialGestureIdentities();
    const storage = givenDelayedLocalWrite();

    const finishing = whenPointingAt('piece-tour', 'PRINCIPALE');
    await whenCaptureHasReachedStorage(storage);
    whenBusinessTimeBecomes('2026-09-05T08:00:01Z');
    const secondaire = whenPointingAt('piece-fraiseuse', 'SECONDAIRE');
    whenBusinessTimeBecomes('2026-09-05T08:00:02Z');
    const stopping = whenStoppingEverything();
    const beforeRelease = await readQueuedGestures();
    whenBusinessTimeBecomes('2026-09-05T08:00:03Z');
    await whenReleasingLocalWrite(storage, finishing, secondaire, stopping);
    const gestures = await readQueuedGestures();

    expect(beforeRelease).toEqual([]);
    expect(gestures).toEqual([
      {
        nature: 'POINTAGE',
        id: identityRootFixture,
        dateDeSurvenue: '2026-09-05T08:00:00.000Z',
        operateurId: 'jean',
        suiviId: 'piece-tour',
        posteId: 'tour',
        type: 'FIN',
      },
      {
        nature: 'POINTAGE',
        id: futureIdentityRootFixture,
        dateDeSurvenue: '2026-09-05T08:00:01.000Z',
        operateurId: 'jean',
        suiviId: 'piece-fraiseuse',
        posteId: 'fraiseuse',
        type: 'FIN',
      },
      {
        nature: 'POINTAGE',
        id: '33333333-3333-4333-8333-333333333333',
        dateDeSurvenue: '2026-09-05T08:00:01.000Z',
        operateurId: 'jean',
        suiviId: 'piece-fraiseuse',
        posteId: 'fraiseuse',
        type: 'NON_CONFORMITE',
      },
      {
        nature: 'POINTAGE',
        id: '44444444-4444-4444-8444-444444444444',
        dateDeSurvenue: '2026-09-05T08:00:02.000Z',
        operateurId: 'jean',
        suiviId: 'piece-fraiseuse',
        posteId: 'fraiseuse',
        type: 'FIN',
      },
    ]);
  });

  it('should append every targeted personal finish as one global stop batch', async () => {
    await givenTwoActiveWorkstations();

    await whenStoppingEverything();

    thenAcceptedBatchesAre([['FIN:piece-tour:tour', 'FIN:piece-fraiseuse:fraiseuse']]);
  });

  it('should keep every activity unchanged and expose the local error when the global batch cannot be appended', async () => {
    await givenTwoActiveWorkstations();
    givenLocalWriteFailsOnce();

    const stopping = whenStoppingEverything();

    await thenFails(stopping, 'disque plein');
    thenAllActivitiesRemain();
    thenGlobalRecordingFailed();
    thenAcceptedBatchesAre([]);
  });

  it('should decide a retained global stop from the window updated by an earlier capture', async () => {
    await givenAnOpenWindow();
    const releaseCapture = givenDelayedCapture();

    const pointage = whenStarting();
    const stopping = whenStoppingEverything();
    whenReleasingCapture(releaseCapture);
    await Promise.all([pointage, stopping]);

    thenNoActivity();
    thenAcceptedBatchesAre([['DEBUT:piece:tour'], ['FIN:piece:tour']]);
  });

  it('should anchor distinct global identities and business time at initiation and replay them unchanged', async () => {
    givenBusinessTime();
    await givenTwoActiveWorkstations();
    const identitySourceFixture = givenChangingGlobalIdentitySource();
    const releaseCapture = givenDelayedCapture();

    const stopping = whenStoppingEverything();
    const initialIdentitySamples = identitySourceFixture.mock.calls.length;
    whenBusinessTimeBecomes('2026-09-05T09:00:00Z');
    whenReleasingCapture(releaseCapture);
    await stopping;

    const gestures = await readQueuedGestures();
    await whenRestoring();
    const restoredGestures = await readQueuedGestures();
    givenAuthorizedAccess();
    await whenSynchronizing();

    expect(initialIdentitySamples).toBe(1);
    thenGesturesHaveDistinctIdentitiesAt(gestures, '2026-09-05T08:00:00.000Z');
    expect(restoredGestures).toEqual(gestures);
    thenReplayedGesturesAre(gestures);
    thenGlobalIdentityWasSampledOnlyAtInitiation(identitySourceFixture);
  });

  it('should refuse pointage and global reentry while a global acceptance is in flight', async () => {
    await givenAnOpenWindow();
    const releaseCapture = givenDelayedCapture();

    const stopping = whenStoppingEverything();
    const pointage = whenPressingPrimaryTarget();
    const pausing = whenPausingGlobally();
    whenReleasingCapture(releaseCapture);
    await Promise.all([stopping, pausing]);

    thenPointageIsUnavailable(pointage);
    thenAcceptedBatchesAre([[]]);
    thenGlobalGesturesAreAvailable(true);
  });

  it('should refuse a prepared workstation choice and another global command while a global acceptance is in flight', async () => {
    await givenAMultiWorkstationOpenWindow();
    const choice = whenPressingPrimaryTarget();
    const releaseCapture = givenDelayedCapture();

    const stopping = whenStoppingEverything();
    const choosing = whenChoosingWorkstationLater(choice, 'tour');
    const pausing = whenPausingGlobally();
    whenReleasingCapture(releaseCapture);
    await Promise.all([stopping, choosing, pausing]);

    thenAcceptedBatchesAre([[]]);
  });

  it('should hide a finished window immediately while a global gesture waits for an earlier capture', async () => {
    await givenAnOpenWindow();
    const releaseCapture = givenDelayedCapture();

    const pointage = whenStarting();
    const stopping = whenStoppingEverything();
    const gesturesBeforeClosing = designation.gestesDisponibles();
    const closing = whenClosing();

    const closingPresentation = readWindowPresentation();
    whenReleasingCapture(releaseCapture);
    await Promise.all([pointage, stopping, closing]);

    expect(gesturesBeforeClosing).toBe(false);
    thenNoWindowPresentationRemains(closingPresentation);
    thenGlobalGesturesAreAvailable(true);
    thenAcceptedBatchesAre([['DEBUT:piece:tour'], ['FIN:piece:tour']]);
  });

  it('should publish global rejection and recovery through its completion and public signals', async () => {
    await givenTwoActiveWorkstations();
    givenLocalWriteFailsOnce();

    const pausing = whenPausingGlobally();
    const availabilityDuringPause = designation.gestesDisponibles();
    await Promise.allSettled([pausing]);
    const failedPresentation = readWindowPresentation();
    const availabilityAfterFailure = designation.gestesDisponibles();
    const retrying = whenPausingGlobally();
    const availabilityDuringRetry = designation.gestesDisponibles();
    await retrying;

    expect(availabilityDuringPause).toBe(false);
    await thenFails(pausing, 'disque plein');
    expect(failedPresentation.echecLocal).toBe(true);
    expect(availabilityAfterFailure).toBe(true);
    expect(availabilityDuringRetry).toBe(false);
    thenGlobalRecordingRecovered();
    thenGlobalGesturesAreAvailable(true);
    thenAcceptedBatchesAre([['FIN:piece-tour:tour', 'FIN:piece-fraiseuse:fraiseuse']]);
  });

  it('should publish a local failure of a pause', async () => {
    await givenTwoActiveWorkstations();
    givenLocalWriteFailsOnce();
    const pausing = whenPausingGlobally();
    await Promise.allSettled([pausing]);

    await thenFails(pausing, 'disque plein');
    thenGlobalRecordingFailed();
  });

  it('should clear the local failure of a pause after a successful retry', async () => {
    await givenTwoActiveWorkstations();
    givenLocalWriteFailsOnce();
    const pausing = whenPausingGlobally();
    await Promise.allSettled([pausing]);
    await whenPausingGlobally();

    thenGlobalRecordingRecovered();
  });

  it('should expose a refused finish from a global stop through one renderable workshop message', async () => {
    await givenTwoActiveWorkstations();
    givenAuthorizedAccess();
    givenServerFailures(undefined, refusalFixture('suivi-d-atelier-cloture'));

    await whenStoppingEverything();
    await whenSynchronizing();

    expect(designation.refusAtelier()).toEqual({
      contexte: { kind: 'COMMANDE_GLOBALE', intention: 'TOUT_ARRETER' },
      message: 'cause conservee',
    });
  });

  it('should resume only the activities whose pause finish was published after the reference was refreshed', async () => {
    await givenTwoActiveWorkstations();
    await whenPausingGlobally();
    givenAuthorizedAccess();
    givenServerFailures(undefined, refusalFixture('suivi-d-atelier-cloture'));
    givenServerReferenceWithoutActivityOn('piece-tour');

    await whenSynchronizing();
    await whenResuming();

    await thenPendingGesturesAre(['DEBUT:piece-tour:tour']);
  });

  it('should keep projecting a pending non conformity on the reference activity once its published opening is forgotten', async () => {
    await givenAnOpenWindow();
    await whenStarting();
    givenAuthorizedAccess();
    givenServerReferenceHoldingTheActivityOpenedBy(await firstQueuedGesture());
    givenServerFailures(undefined, new Error('reseau coupe'));
    givenNonConformityIsReportedDuringReferenceRefresh();

    await whenSynchronizing();

    await thenQueueHas(2);
    await thenPendingGesturesAre(['FIN:piece:tour', 'NON_CONFORMITE:piece:tour']);
    thenActivityIs('NON_CONFORMITE');
  });

  it('should clear the current refusal as soon as a new business intent starts', async () => {
    await givenAnOpenWindow();
    givenAuthorizedAccess();
    givenServerFailures(refusalFixture('suivi-d-atelier-cloture'));
    await whenStarting();
    await whenSynchronizing();
    const releaseCapture = givenDelayedCapture();

    const pausing = whenPausingGlobally();

    const duringCapture = whenReadingTheRefusalState();
    whenReleasingCapture(releaseCapture);
    await pausing;

    expect(duringCapture).toEqual({ echecLocal: false, refus: undefined });
  });

  it('should reject a gesture when its local commit fails', async () => {
    await givenAnOpenWindow();
    givenLocalWriteFailsOnce();
    const failedStart = whenStarting();
    await Promise.allSettled([failedStart]);

    await thenFails(failedStart, 'disque plein');
    await thenQueueHas(0);
    thenNoActivity();
  });

  it('should accept a gesture durably after retrying a failed commit', async () => {
    await givenAnOpenWindow();
    givenLocalWriteFailsOnce();
    const failedStart = whenStarting();
    await Promise.allSettled([failedStart]);
    await whenStarting();

    await thenQueueHas(1);
  });

  it('should keep the semantic tile unchanged and expose a persistent message until the next durable acceptance', async () => {
    await givenAnOpenWindow();
    givenLocalWriteFailsOnce();

    const failed = whenPressingPrimaryTarget();

    await thenSemanticCaptureFails(failed);
    thenPointageRecordingFailedWithoutAdvancing();

    await thenSemanticCaptureSucceeds(whenPressingPrimaryTarget());

    thenPointageRecordingRecoveredAndAdvanced();
  });

  it('should create no gesture before the final workstation choice', async () => {
    await givenAMultiWorkstationOpenWindow();
    whenPressingPrimaryTarget();

    await thenNoGestureExistsBeforeChoice();
  });

  it('should record the finally chosen workstation', async () => {
    await givenAMultiWorkstationOpenWindow();
    const choice = whenPressingPrimaryTarget();
    await whenChoosingWorkstation(choice, 'fraiseuse');

    await thenPointageUsesWorkstation('fraiseuse');
  });

  it('should fix the complete opening at the final workstation choice before delayed durable acceptance', async () => {
    await givenAMultiWorkstationOpenWindow();
    givenSequentialGestureIdentities();
    const storage = givenDelayedLocalWrite();

    const choice = whenPressingPrimaryTarget();
    const beforeChoice = await readQueuedGestures();
    whenBusinessTimeBecomes('2026-09-05T08:00:10Z');
    const choosing = whenChoosingWorkstation(choice, 'fraiseuse');
    await whenCaptureHasReachedStorage(storage);
    whenBusinessTimeBecomes('2026-09-05T08:00:20Z');
    await whenReleasingLocalWrite(storage, choosing);
    const gestures = await readQueuedGestures();

    expect(beforeChoice).toEqual([]);
    expect(gestures).toEqual([
      {
        nature: 'POINTAGE',
        id: identityRootFixture,
        dateDeSurvenue: '2026-09-05T08:00:10.000Z',
        operateurId: 'jean',
        suiviId: 'piece',
        posteId: 'fraiseuse',
        type: 'DEBUT',
      },
    ]);
  });

  it('should reject a workstation choice after its operator window was replaced', async () => {
    await givenAMultiWorkstationOpenWindow();
    const choice = whenPressingPrimaryTarget();
    await whenClosing();
    await givenAMultiWorkstationOpenWindow();

    const staleChoice = whenChoosingWorkstationLater(choice, 'tour');

    await thenFails(staleChoice, 'fenetre operateur a change');
  });

  it('should keep a prepared workstation choice valid when the same operator window receives a reconciled reference', async () => {
    await givenAMultiWorkstationOpenWindow();
    const choice = whenPressingPrimaryTarget();

    await whenRestoring();
    await whenChoosingWorkstation(choice, 'fraiseuse');

    await thenPointageUsesWorkstation('fraiseuse');
  });

  it('should retain a failed push', async () => {
    await givenPendingOpening();
    givenAuthorizedAccess();
    givenServerFailures(new Error('reseau absent'));
    await whenSynchronizing();

    thenConnectedIs(false);
    await thenPendingIs(1);
  });

  it('should replay the same gesture after reconnection', async () => {
    await givenPendingOpening();
    givenAuthorizedAccess();
    givenServerFailures(new Error('reseau absent'));
    await whenSynchronizing();
    await whenSynchronizing();

    thenConnectedIs(true);
    thenJournalIs([ouvertureFixture]);
  });

  it('should retain a server acceptance when local acknowledgement fails', async () => {
    await givenPendingOpening();
    givenAuthorizedAccess();
    givenAcknowledgementFailsOnce();
    const failedSynchronization = whenSynchronizing();
    await Promise.allSettled([failedSynchronization]);

    await thenFails(failedSynchronization, 'disque plein');
    await thenPendingIs(1);
  });

  it('should replay a server acceptance after local acknowledgement failure', async () => {
    await givenPendingOpening();
    givenAuthorizedAccess();
    givenAcknowledgementFailsOnce();
    const failedSynchronization = whenSynchronizing();
    await Promise.allSettled([failedSynchronization]);
    await whenSynchronizing();

    thenJournalIs([ouvertureFixture, ouvertureFixture]);
    await thenPendingIs(0);
  });

  it('should remove activity rejected by the server', async () => {
    await givenWorkStartedOffline();
    givenAuthorizedAccess();
    givenServerFailures(refusalFixture('suivi-d-atelier-cloture'));
    await whenSynchronizing();

    thenNoActivity();
  });

  it('should retain a final refusal while processing subsequent gestures', async () => {
    await givenWorkStartedOffline();
    givenAuthorizedAccess();
    givenServerFailures(refusalFixture('suivi-d-atelier-cloture'));
    await whenSynchronizing();
    await whenStoppingEverything();
    await whenSynchronizing();
    await whenClosing();

    thenNoActivity();
    await thenPendingIs(0);
    await thenRefusalIs('suivi-d-atelier-cloture');
  });

  it('should reread before retrying a concurrent gesture with its original body', async () => {
    await givenPendingOpening();
    givenAuthorizedAccess();
    givenServerFailures(refusalFixture('saisie-concurrente'));

    await whenSynchronizing();

    thenChronologyIs(['arrivee', 'relecture', 'arrivee']);
    thenJournalIs([ouvertureFixture]);
  });

  it('should preserve a repeated race as a final diagnostic after rereading and retrying', async () => {
    await givenPendingOpening();
    givenAuthorizedAccess();
    givenServerFailures(refusalFixture('saisie-concurrente'), refusalFixture('saisie-concurrente'));

    await whenSynchronizing();

    await thenPendingIs(0);
    thenConnectedIs(true);
    await thenRefusalIs('saisie-concurrente');
  });

  it('should preserve a stable business refusal after one concurrent retry', async () => {
    await givenPendingOpening();
    givenAuthorizedAccess();
    givenServerFailures(refusalFixture('saisie-concurrente'), refusalFixture('operateur-non-habilite'));

    await whenSynchronizing();

    await thenPendingIs(0);
  });

  it('should retain designation while refreshing the referential', async () => {
    await givenAnOpenWindow();
    givenAuthorizedAccess();
    givenRefreshedIdentifiant('050');
    await whenSynchronizing();

    thenIdentifiantIs('050');
    thenDesignatedIdentifiantIs('049');
  });

  it('should retain the refreshed referential after closing designation', async () => {
    await givenAnOpenWindow();
    givenAuthorizedAccess();
    givenRefreshedIdentifiant('050');
    await whenSynchronizing();
    await whenClosing();

    thenIdentifiantIs('050');
  });

  it('should retain the last complete cache through failed refreshes without a time limit', async () => {
    givenAuthorizedAccess();
    givenReferenceRefreshFails();

    await whenSynchronizing();

    thenIdentifiantIs('049');
    thenConnectedIs(true);
  });

  it('should reject a gesture on an old company window after reenrolment', async () => {
    await givenWorkStartedOffline();
    givenReenrolledForAnotherCompany();
    const failedStart = whenStarting();
    await Promise.allSettled([failedStart]);

    await thenFails(failedStart, 'fenetre operateur a change');
  });

  it('should suspend the old company queue after reenrolment', async () => {
    await givenWorkStartedOffline();
    givenReenrolledForAnotherCompany();
    const failedStart = whenStarting();
    await Promise.allSettled([failedStart]);
    await whenSynchronizing();

    await thenOldCompanyPendingIs(1);
    thenJournalIs([]);
  });

  it('should reject an unknown operator after reenrolment', async () => {
    await givenWorkStartedOffline();
    givenReenrolledForAnotherCompany();
    const failedStart = whenStarting();
    await Promise.allSettled([failedStart]);
    await whenSynchronizing();
    const unknownOpening = whenOpeningIdentifiant('inconnu');
    await Promise.allSettled([unknownOpening]);

    await thenFails(unknownOpening, 'Identifiant absent');
  });

  it('should report a local failure before changing company', async () => {
    await givenWorkStartedOffline();
    givenLocalWriteFailsOnce();
    const failedStop = whenStarting();
    await Promise.allSettled([failedStop]);

    await thenFails(failedStop, 'disque plein');
  });

  it('should retain the operator presentation before changing company', async () => {
    await givenWorkStartedOffline();
    givenLocalWriteFailsOnce();
    const failedStop = whenStarting();
    await Promise.allSettled([failedStop]);
    givenAuthorizedAccess();
    givenServerFailures(refusalFixture('suivi-d-atelier-cloture'));
    await whenSynchronizing();

    thenTheWindowPresentationIsPopulated();
  });

  it('should clear every operator presentation when restoring another company', async () => {
    await givenWorkStartedOffline();
    givenLocalWriteFailsOnce();
    const failedStop = whenStarting();
    await Promise.allSettled([failedStop]);
    givenAuthorizedAccess();
    givenServerFailures(refusalFixture('suivi-d-atelier-cloture'));
    await whenSynchronizing();
    givenReenrolledForAnotherCompany();
    await whenRestoring();

    thenNoWindowPresentationRemains();
  });

  it('should discard a cache response received after the company changed', async () => {
    givenAuthorizedAccess();
    givenCompanyChangesDuringReferenceRefresh();

    await whenSynchronizing();

    await thenNoCompanyBData();
  });

  it('should stop a replay when authorization changes during the reread', async () => {
    await givenPendingOpening();
    givenAuthorizedAccess();
    givenServerFailures(refusalFixture('saisie-concurrente'));
    givenCompanyChangesDuringReread();

    await whenSynchronizing();

    thenJournalIs([]);
    await thenOldCompanyPendingIs(1);
  });

  it('should finish acknowledging the old company response without sending its next event under another token', async () => {
    await givenPendingOpening();
    givenAuthorizedAccess();
    givenCompanyChangesDuringSend();

    await whenSynchronizing();

    await thenOldCompanyPendingIs(0);
  });

  it('should preserve gestures appended while a push is in flight', async () => {
    await givenWorkStartedOffline();
    givenAuthorizedAccess();
    givenPauseIsAppendedDuringSend();

    await whenSynchronizingConcurrently();
    await whenClosing();

    thenPublishedTypesAre(['DEBUT', 'FIN']);
    await thenPendingIs(0);
  });

  it('should accept only one concurrent operator opening and keep that operator for the next gesture', async () => {
    await givenTwoOperators();

    const openings = await whenOpeningBothOperators();

    await whenStarting();
    givenAuthorizedAccess();
    await whenSynchronizing();

    const acceptedOperator = thenOnlyOneWindowIsAccepted(openings);
    thenOpeningBelongsTo(acceptedOperator);
  });

  it('should reject an unknown operator code', async () => {
    const unknownOpening = whenOpeningIdentifiant('inconnu');
    await Promise.allSettled([unknownOpening]);

    await thenFails(unknownOpening, 'Identifiant absent');
  });

  it('should reject overlapping windows and unauthorized workstations', async () => {
    const unknownOpening = whenOpeningIdentifiant('inconnu');
    await Promise.allSettled([unknownOpening]);
    await givenAMultiWorkstationOpenWindow();
    const overlappingOpening = whenOpening();
    const unauthorizedPointage = whenStartingOn('interdit');

    await thenOpeningAndPointageAreRefused(overlappingOpening, unauthorizedPointage);
    await thenQueueHas(0);
  });

  it('should expose the restored company reference', async () => {
    await givenRestoredPupitre();

    thenIdentifiantIs('049');
  });

  it('should clear the reference when durable company selection disappears', async () => {
    await givenRestoredPupitre();
    givenNoCompanySelected();
    await whenSynchronizing();

    thenNoReference();
  });

  it('should require enrolment before opening an operator', async () => {
    givenNoCompanySelected();
    await whenRestoring();
    const opening = whenOpening();
    await Promise.allSettled([opening]);

    await thenFails(opening, 'enrole');
    thenNoReference();
  });

  it('should require an operator window before pausing', async () => {
    givenNoCompanySelected();
    await whenRestoring();
    const opening = whenOpening();
    await Promise.allSettled([opening]);
    const pausing = await whenPausingWithoutWindow();

    thenGestureNeedsAWindow(pausing);
  });

  it('should reject a window when the company changes while restoring it', async () => {
    givenCompanyChangesDuringRestore();

    const opening = whenOpening();

    await thenFails(opening, 'entreprise du pupitre a change');
  });

  it('should expose no reference before any data exists', async () => {
    givenEmptyCompanySelected();
    await whenRestoring();

    thenNoReference();
  });

  it('should expose an empty diagnostic for an unknown operator', async () => {
    givenEmptyCompanySelected();
    await whenRestoring();
    const opening = whenOpening();
    await Promise.allSettled([opening]);

    await thenFails(opening, 'Identifiant absent');
    await thenDiagnosticsCountIs(0);
  });

  it('should report a background acknowledgement failure', async () => {
    await givenAnOpenWindow();
    givenAuthorizedAccess();
    givenAcknowledgementFailsOnce();
    await whenStarting();
    await whenSynchronizing();

    thenBackgroundAcknowledgementFailureWasReported();
  });

  it('should retain a durably accepted gesture after background failure and restart', async () => {
    await givenAnOpenWindow();
    givenAuthorizedAccess();
    givenAcknowledgementFailsOnce();
    await whenStarting();
    const failedSynchronization = whenSynchronizing();
    await Promise.allSettled([failedSynchronization]);
    await whenRestarting();

    await thenQueueHas(1);
  });

  it('should push a gesture accepted while the reference is being refreshed without waiting for the next minute', async () => {
    await givenAnOpenWindow();
    givenAuthorizedAccess();
    givenOpeningIsAppendedDuringReferenceRefresh();
    const acknowledgement = givenTheNextPublicationAcknowledgement();

    await whenSynchronizing();
    await whenClosing();
    await whenPublicationIsAcknowledged(acknowledgement);

    await thenQueueHas(1);
    await thenPendingIs(0);
  });

  it('should durably retain a pointage started before expiry while refusing subsequent gestures during closure', async () => {
    givenBusinessTime();
    await givenAnOpenWindow();
    const releaseCapture = givenDelayedCapture();

    const pointage = whenStarting();
    whenSleepingPastDesignation();
    const closing = whenExpiring();

    const closureFailure = whenAttemptingPointageDuringClosure();

    whenReleasingCapture(releaseCapture);
    await whenCaptureAndClosureComplete(pointage, closing);

    expect(closureFailure).toBeInstanceOf(Error);
    expect(closureFailure).toHaveProperty('message', 'Aucune fenetre operateur ouverte.');
    await thenQueueHas(1);
    await thenPointageKeepsItsOriginalOperatorAndTime();
  });

  it('should retain a finish initiated before its exact deadline through delayed storage and pause only the remaining activity', async () => {
    whenBusinessTimeBecomes('2026-09-05T19:59:59.999Z');
    await givenTwoActiveWorkstations();
    givenSequentialGestureIdentities();
    const storage = givenDelayedLocalWrite();

    const finishing = whenPointingAt('piece-tour', 'PRINCIPALE');
    await whenCaptureHasReachedStorage(storage);
    whenBusinessTimeBecomes('2026-09-05T20:00:00Z');
    const pausing = whenPausingGlobally();
    const atDeadline = designation.pointage();
    whenBusinessTimeBecomes('2026-09-05T20:00:01Z');
    await whenReleasingLocalWrite(storage, finishing, pausing);
    const gestures = await readQueuedGestures();

    expect(
      elementsDeLaZoneFixture(atDeadline, 'MOULE')
        .find(element => element.id === 'piece-tour')
        ?.isActive(),
    ).toBe(false);
    expect(
      elementsDeLaZoneFixture(atDeadline, 'MOULE')
        .find(element => element.id === 'piece-fraiseuse')
        ?.isActive(),
    ).toBe(true);
    expect(
      elementsDeLaZoneFixture(atDeadline, 'MOULE')
        .find(element => element.id === 'piece-fraiseuse')
        ?.dureeMs(),
    ).toBe(44_999_999);
    expect(gestures).toEqual([
      {
        nature: 'POINTAGE',
        id: identityRootFixture,
        dateDeSurvenue: '2026-09-05T19:59:59.999Z',
        operateurId: 'jean',
        suiviId: 'piece-tour',
        posteId: 'tour',
        type: 'FIN',
      },
      {
        nature: 'POINTAGE',
        id: futureIdentityRootFixture,
        dateDeSurvenue: '2026-09-05T20:00:00.000Z',
        operateurId: 'jean',
        suiviId: 'piece-fraiseuse',
        posteId: 'fraiseuse',
        type: 'FIN',
        suspension: { pause: futureIdentityRootFixture, reouverture: 'DEBUT' },
      },
    ]);
  });

  it('should retain a successful append without restoring an old operator presentation after the tenant changes during storage I/O', async () => {
    await givenAnOpenWindow();
    const append = journal.delayNextAppend();
    const pointage = whenStarting();

    await append.started;
    givenReenrolledForAnotherCompany();
    await whenRestoring();
    append.release();
    await pointage;

    await thenOldCompanyPendingIs(1);
    thenNoWindowPresentationRemains();
    expect(pupitre.echecCaptureLocale()).toBe(false);
    expect(designation.refusAtelier()).toBeUndefined();
  });

  it('should refuse a capture before append when its operator window has been released during session I/O', async () => {
    await givenAnOpenWindow();
    const synchronization = authentication.delayNextSynchronization();
    const pointage = whenStarting();

    await synchronization.started;
    givenNoCompanySelected();
    await whenRestoring();
    authentication.tenant = 'entreprise-a';
    synchronization.release();

    await thenFails(pointage, 'fenetre operateur a change');
    await thenOldCompanyPendingIs(0);
    thenNoWindowPresentationRemains();
    expect(pupitre.echecCaptureLocale()).toBe(false);
    expect(designation.refusAtelier()).toBeUndefined();
  });

  it('should disable validation while resolving and drain window if resolution expired during opening', async () => {
    givenBusinessTime();
    givenDigitsEntered('049');
    const validationBeforeOpening = designation.canValidate();

    const opening = whenValidating();
    const validationDuringOpening = designation.canValidate();

    whenSleepingPastDesignation();
    await opening;

    expect(validationBeforeOpening).toBe(true);
    expect(validationDuringOpening).toBe(false);
    thenNoWindowPresentationRemains();
  });

  it('should clear errors immediately when closing begins and restore validate capability when closure completes', async () => {
    await givenAnOpenWindow();
    await givenFailedLocalSemanticCapture();
    const failureBeforeClosing = pupitre.echecCaptureLocale();

    const releaseCapture = givenDelayedCapture();
    const pointage = whenStarting();
    const closing = whenClosing();

    const closingPresentation = readWindowPresentation();
    givenDigitsEntered('0');
    const validationDuringClosure = designation.canValidate();

    whenReleasingCapture(releaseCapture);
    await whenCaptureAndClosureComplete(pointage, closing);

    expect(failureBeforeClosing).toBe(true);
    thenWorkshopMessageIsCleared(closingPresentation);
    expect(validationDuringClosure).toBe(false);
    thenValidationIsAvailable(true);
  });

  it('should clear active refusals immediately when closing begins', async () => {
    await givenAMultiWorkstationOpenWindow();
    await givenServerRefusalOnStart('tour');
    const messageBeforeClosing = designation.refusAtelier();

    const closing = whenClosing();

    const closingPresentation = readWindowPresentation();

    await closing;

    expect(messageBeforeClosing).toBeDefined();
    thenWorkshopMessageIsCleared(closingPresentation);
  });

  it('should expose pointage projection immediately when window is opened', async () => {
    await whenOpening();

    thenPointageIsDefined();
    thenDesignatedIdentifiantIs('049');
  });

  it('should display the existing workstation refusal', async () => {
    await givenAMultiWorkstationOpenWindow();
    await givenServerRefusalOnStart('tour');

    thenWorkshopMessageIsDefined();
  });

  it('should clear a refusal when requesting another workstation choice', async () => {
    await givenAMultiWorkstationOpenWindow();
    await givenServerRefusalOnStart('tour');
    const choice = whenPressingPrimaryTarget();

    thenChoiceRequiresWorkstation(choice);
    thenWorkshopMessageIsCleared();
  });

  it('should report an error when background synchronization fails after durable acceptance', async () => {
    await givenAnOpenWindow();
    givenBackgroundSynchronizationFails();

    await whenStarting();
    await roundTrip();

    thenBackgroundSynchronizationInterruptionWasReported();
  });

  it('should display the existing refusal before company change', async () => {
    await givenAnOpenWindow();
    await givenServerRefusalOnStart('tour');

    thenWorkshopMessageIsDefined();
  });

  it('should clear an existing refusal when changing company', async () => {
    await givenAnOpenWindow();
    await givenServerRefusalOnStart('tour');
    givenReenrolledForAnotherCompany();
    await whenRestoring();

    thenNoWindowPresentationRemains();
  });

  it('should renew inactivity deadline when initiating a gesture in an open window', async () => {
    givenBusinessTime();
    await givenAnOpenWindow();
    const initialDeadline = scheduler.scheduledDeadlines.at(-1);

    whenBusinessTimeBecomes('2026-09-05T08:00:10Z');
    whenPressingPrimaryTarget();

    thenInactivityDeadlineWasRenewed(initialDeadline);
  });

  const givenBusinessTime = (): void => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-05T08:00:00Z'));
  };
  const givenChangingGlobalIdentitySource = (): MockInstance =>
    vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce(identityRootFixture).mockReturnValue(futureIdentityRootFixture);
  const givenSequentialGestureIdentities = (): void => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce(identityRootFixture)
      .mockReturnValueOnce(futureIdentityRootFixture)
      .mockReturnValueOnce('33333333-3333-4333-8333-333333333333')
      .mockReturnValueOnce('44444444-4444-4444-8444-444444444444');
  };
  const givenDelayedLocalWrite = (): ReturnType<ApplicationJournalFixture['delayNextAppend']> => journal.delayNextAppend();
  const whenCaptureHasReachedStorage = (storage: ReturnType<ApplicationJournalFixture['delayNextAppend']>): Promise<void> =>
    storage.started;
  const whenReleasingLocalWrite = async (
    storage: ReturnType<ApplicationJournalFixture['delayNextAppend']>,
    ...captures: Promise<void>[]
  ): Promise<void> => {
    storage.release();
    await Promise.all(captures);
  };
  const givenDelayedCapture = (): (() => void) => {
    let release: (() => void) | undefined;
    authentication.pendingSynchronization = new Promise(resolve => {
      release = resolve;
    });
    if (release === undefined) throw new Error('Delayed capture is not initialized.');
    return release;
  };
  const whenSleepingPastDesignation = (): void => {
    vi.setSystemTime(new Date('2026-09-05T08:00:31Z'));
  };
  const whenBusinessTimeBecomes = (instant: string): void => {
    vi.setSystemTime(new Date(instant));
  };
  const whenExpiring = (): Promise<void> => designation.expire();
  const whenReleasingCapture = (release: () => void): void => {
    release();
  };
  const whenReadingTheRefusalState = (): { echecLocal: boolean; refus: ReturnType<CurrentOperateurLifecycle['refusAtelier']> } => ({
    echecLocal: pupitre.echecCaptureLocale(),
    refus: designation.refusAtelier(),
  });
  const whenCaptureAndClosureComplete = async (pointage: Promise<void>, closing: Promise<void>): Promise<void> => {
    await Promise.all([pointage, closing]);
  };
  const whenAttemptingPointageDuringClosure = (): unknown => {
    try {
      return pupitre.execute({ suiviId: 'piece', cible: 'PRINCIPALE' });
    } catch (failure: unknown) {
      return failure;
    }
  };
  const thenPointageKeepsItsOriginalOperatorAndTime = async (): Promise<void> => {
    const gestes = (await journal.read(Entreprise.of('entreprise-a'))).evenements.map(evenement => evenement.geste);
    expect(gestes).toContainEqual(
      expect.objectContaining({ nature: 'POINTAGE', operateurId: 'jean', dateDeSurvenue: '2026-09-05T08:00:00.000Z' }),
    );
  };

  const buildPupitre = (): AtelierCoordinator => {
    const injector = Injector.create({
      providers: [
        GestesRecordingQueue,
        EtatHorsLigneDuPupitre,
        FraicheurDuReferentiel,
        AtelierCoordinator,
        CurrentOperateurLifecycle,
        PupitreSynchronization,
        { provide: JournauxDuPupitrePort, useValue: journal },
        { provide: AtelierExchangePort, useValue: serveur },
        { provide: AuthenticationPort, useValue: authentication },
        { provide: DesignationExpirationSchedulerPort, useValue: scheduler },
        { provide: ActiviteExpirationSchedulerPort, useValue: { schedule: () => undefined } },
        { provide: DeviceSessionPort, useClass: DeviceSessionFixture },
        { provide: ErrorHandlerPort, useValue: errorHandler },
      ],
    });
    designation = injector.get(CurrentOperateurLifecycle);
    etatHorsLigne = injector.get(EtatHorsLigneDuPupitre);
    return injector.get(AtelierCoordinator);
  };
  const whenRestarting = async (): Promise<void> => {
    await pupitre.synchronize();
    pupitre = buildPupitre();
    await whenRestoring();
  };
  const whenOpening = (): Promise<unknown> => designation.openWindow(identifiantFixture('049'));
  const whenOpeningIdentifiant = (identifiant: string): Promise<unknown> => designation.openWindow(identifiantFixture(identifiant));
  const whenOpeningBothOperators = (): Promise<PromiseSettledResult<IdentiteOperateurDesigne>[]> =>
    Promise.allSettled([designation.openWindow(identifiantFixture('049')), designation.openWindow(identifiantFixture('050'))]);
  const whenStarting = (): Promise<void> => completionOf(pupitre.execute({ suiviId: 'piece', cible: 'PRINCIPALE' }));
  const whenPointingAt = (suiviId: string, cible: 'PRINCIPALE' | 'SECONDAIRE'): Promise<void> =>
    completionOf(pupitre.execute({ suiviId, cible }));
  const whenPressingPrimaryTarget = (): ReturnType<AtelierCoordinator['execute']> =>
    pupitre.execute({ suiviId: 'piece', cible: 'PRINCIPALE' });
  const whenChoosingWorkstation = async (execution: ReturnType<AtelierCoordinator['execute']>, posteId: string): Promise<void> => {
    if (execution.kind !== 'CHOIX_POSTE_REQUIS') throw new Error('Expected workstation choice fixture.');
    await execution.choose(posteId);
  };
  const whenChoosingWorkstationLater = (execution: ReturnType<AtelierCoordinator['execute']>, posteId: string): Promise<void> =>
    Promise.resolve().then(() => whenChoosingWorkstation(execution, posteId));
  const whenStartingOn = (posteId: string): Promise<void> => {
    const execution = pupitre.execute({ suiviId: 'piece', cible: 'PRINCIPALE' });
    if (execution.kind === 'CHOIX_POSTE_REQUIS') return Promise.resolve().then(() => execution.choose(posteId));
    return completionOf(execution);
  };
  const whenStartingAndReportingNonConformity = async (): Promise<void> => {
    await Promise.all([whenStarting(), completionOf(pupitre.execute({ suiviId: 'piece', cible: 'SECONDAIRE' }))]);
  };
  const whenPausingGlobally = (): Promise<void> => pupitre.executeGlobale('PAUSE');
  const whenResuming = (): Promise<void> => pupitre.executeGlobale('REPRENDRE');
  const whenStoppingEverything = (): Promise<void> => pupitre.executeGlobale('TOUT_ARRETER');
  const whenSynchronizing = (): Promise<void> => pupitre.synchronize();
  const whenSynchronizingConcurrently = async (): Promise<void> => {
    await Promise.all([pupitre.synchronize(), pupitre.synchronize()]);
  };
  const whenClosing = (): Promise<void> => designation.finish();
  const whenRestoring = (): Promise<void> =>
    etatHorsLigne.refresh('RESTORE', (entreprise, state) => {
      designation.reconcile(entreprise, state);
    });
  const whenPausingWithoutWindow = async (): Promise<unknown> => {
    try {
      await whenPausingGlobally();
      return undefined;
    } catch (failure) {
      return failure;
    }
  };
  const givenCachedReference = async (reference: ReferentielDuPupitre): Promise<void> => {
    await journal.saveReferentiel(Entreprise.of('entreprise-a'), structuredClone(reference));
  };
  const givenAnOpenWindow = async (): Promise<void> => {
    await designation.openWindow(identifiantFixture('049'));
  };
  const givenAMultiWorkstationOpenWindow = async (): Promise<void> => {
    const operateur = requiredFixture(referenceFixture.operateurs[0], 'operator');
    await givenCachedReference({
      ...referenceFixture,
      operateurs: [{ ...operateur, postes: [...operateur.postes, { id: 'fraiseuse', libelle: 'Fraiseuse' }] }],
    });
    await givenAnOpenWindow();
  };
  const twoActiveWorkstationsReference = (): ReferentielDuPupitre => {
    const operateur = requiredFixture(referenceFixture.operateurs[0], 'operator');
    const suivi = requiredFixture(referenceFixture.suivis[0], 'workshop element');
    return {
      ...referenceFixture,
      operateurs: [{ ...operateur, postes: [...operateur.postes, { id: 'fraiseuse', libelle: 'Fraiseuse' }] }],
      suivis: [
        {
          ...suivi,
          id: 'piece-tour',
          nom: 'OF-tour',
          activites: [
            {
              ouverture: 'activite-fixture-34',
              echeance: '2026-09-05T20:00:00.000Z',
              operateurId: 'jean',
              categorie: 'TRAVAIL',
              depuis: '2026-09-05T07:00:00Z',
              posteId: 'tour',
            },
          ],
        },
        {
          ...suivi,
          id: 'piece-fraiseuse',
          nom: 'OF-fraiseuse',
          activites: [
            {
              ouverture: 'activite-fixture-35',
              echeance: '2026-09-05T20:30:00.000Z',
              operateurId: 'jean',
              categorie: 'TRAVAIL',
              depuis: '2026-09-05T07:30:00Z',
              posteId: 'fraiseuse',
            },
          ],
        },
      ],
    };
  };
  const givenTwoActiveWorkstations = async (): Promise<void> => {
    await givenCachedReference(twoActiveWorkstationsReference());
    await givenAnOpenWindow();
  };
  const givenNonConformityReportedDuringWork = async (): Promise<void> => {
    await givenWorkStartedOffline();
    whenBusinessTimeBecomes('2026-09-05T08:00:01Z');
    await whenPointingAt('piece', 'SECONDAIRE');
  };
  const givenWorkStartedOffline = async (): Promise<void> => {
    await givenAnOpenWindow();
    await whenStarting();
  };

  const givenRestoredPupitre = async (): Promise<void> => {
    await whenRestoring();
  };
  const givenPendingOpening = async (): Promise<void> => {
    await journal.append(Entreprise.of('entreprise-a'), [ouvertureFixture]);
  };
  const givenAuthorizedAccess = (): void => {
    authentication.token = 'autorise';
  };
  const givenServerFailures = (...failures: (Error | undefined)[]): void => {
    serveur.failures = failures;
  };
  const givenLocalWriteFailsOnce = (): void => {
    journal.failWrite = true;
  };
  const givenAcknowledgementFailsOnce = (): void => {
    serveur.beforeSend = () => {
      journal.failWrite = true;
    };
  };
  const givenRefreshedIdentifiant = (identifiant: string): void => {
    const operateur = requiredFixture(serveur.reference.operateurs[0], 'server operator');
    serveur.reference = { ...serveur.reference, operateurs: [{ ...operateur, identifiant }] };
  };
  const givenReferenceRefreshFails = (): void => {
    serveur.cacheFailure = new Error('page manquante');
  };
  const givenReenrolledForAnotherCompany = (): void => {
    authentication.tenant = 'entreprise-b';
    authentication.token = 'nouveau';
  };
  const givenCompanyChangesDuringReferenceRefresh = (): void => {
    serveur.afterReference = () => {
      authentication.tenant = 'entreprise-b';
    };
  };
  const givenCompanyChangesDuringReread = (): void => {
    serveur.afterReread = () => {
      authentication.tenant = 'entreprise-b';
    };
  };
  const givenCompanyChangesDuringSend = (): void => {
    serveur.beforeSend = () => {
      authentication.tenant = 'entreprise-b';
    };
  };
  const givenPauseIsAppendedDuringSend = (): void => {
    serveur.beforeSend = () => {
      void pupitre.executeGlobale('PAUSE');
    };
  };
  const givenTwoOperators = async (): Promise<void> => {
    await journal.saveReferentiel(Entreprise.of('entreprise-a'), {
      ...referenceFixture,
      operateurs: [...referenceFixture.operateurs, { id: 'marie', nom: 'Martin', prenom: 'Marie', identifiant: '050', postes: [] }],
    });
  };
  const givenNoCompanySelected = (): void => {
    authentication.tenant = undefined;
  };
  const givenCompanyChangesDuringRestore = (): void => {
    journal.afterRead = () => {
      authentication.tenant = 'entreprise-b';
    };
  };
  const givenEmptyCompanySelected = (): void => {
    authentication.tenant = 'entreprise-vide';
  };
  const givenServerReferenceWithoutActivityOn = (suiviId: string): void => {
    const reference = twoActiveWorkstationsReference();
    serveur.reference = {
      ...reference,
      suivis: reference.suivis.map(suivi => (suivi.id === suiviId ? { ...suivi, activites: [] } : suivi)),
    };
  };
  const firstQueuedGesture = async (): Promise<GesteDePointage> => requiredFixture((await readQueuedGestures())[0], 'first queued gesture');
  const givenServerReferenceHoldingTheActivityOpenedBy = (opening: GesteDePointage): void => {
    const suivi = requiredFixture(serveur.reference.suivis[0], 'server workshop element');
    serveur.reference = {
      ...serveur.reference,
      suivis: [
        {
          ...suivi,
          etat: 'EN_COURS',
          activites: [
            {
              ouverture: opening.id,
              echeance: '2026-09-06T01:00:00.000Z',
              operateurId: 'jean',
              categorie: 'TRAVAIL',
              depuis: opening.dateDeSurvenue,
              posteId: 'tour',
            },
          ],
        },
      ],
    };
  };
  const givenNonConformityIsReportedDuringReferenceRefresh = (): void => {
    serveur.afterReference = () => {
      serveur.afterReference = undefined;
      void whenPointingAt('piece', 'SECONDAIRE');
    };
  };
  const givenTheNextPublicationAcknowledgement = (): Promise<void> => journal.waitForNextAcknowledgement();
  const whenPublicationIsAcknowledged = (acknowledgement: Promise<void>): Promise<void> => acknowledgement;
  const thenBackgroundAcknowledgementFailureWasReported = (): void => {
    expect(errorHandler.errors).toEqual([new Error('disque plein')]);
  };
  const givenOpeningIsAppendedDuringReferenceRefresh = (): void => {
    serveur.afterReference = () => {
      serveur.afterReference = undefined;
      void whenStarting();
    };
  };
  const thenQueueHas = async (count: number): Promise<void> => {
    expect((await journal.read(Entreprise.of('entreprise-a'))).evenements).toHaveLength(count);
  };
  const thenPendingGesturesAre = async (descriptions: string[]): Promise<void> => {
    const pending = (await journal.read(Entreprise.of('entreprise-a'))).evenements.filter(event => event.etat === 'EN_ATTENTE');
    expect(pending.map(({ geste }) => `${geste.type}:${geste.suiviId}:${geste.posteId}`)).toEqual(descriptions);
  };
  const thenAcceptedBatchesAre = (batches: string[][]): void => {
    expect(journal.acceptedBatches).toEqual(batches);
  };
  const thenTheServerReceived = (gestes: string[]): void => {
    expect(serveur.journal.map(({ type, dateDeSurvenue }) => `${type}@${dateDeSurvenue}`)).toEqual(gestes);
  };
  const thenAllActivitiesRemain = (): void => {
    expect(etatHorsLigne.referentiel()?.suivis.flatMap(suivi => suivi.activites)).toHaveLength(2);
  };
  const thenGlobalRecordingFailed = (): void => {
    expect(pupitre.echecCaptureLocale()).toBe(true);
  };
  const thenGlobalRecordingRecovered = (): void => {
    expect(pupitre.echecCaptureLocale()).toBe(false);
    expect(designation.refusAtelier()).toBeUndefined();
  };
  const thenGlobalGesturesAreAvailable = (available: boolean): void => {
    expect(designation.gestesDisponibles()).toBe(available);
  };
  const thenPointageIsUnavailable = (execution: ReturnType<AtelierCoordinator['execute']>): void => {
    expect(execution).toEqual({ kind: 'INDISPONIBLE' });
  };

  const thenSemanticCaptureFails = async (execution: ReturnType<AtelierCoordinator['execute']>): Promise<void> => {
    if (execution.kind !== 'CAPTURE') throw new Error('Expected capture fixture.');
    await expect(execution.completion).rejects.toThrow('disque plein');
  };
  const thenSemanticCaptureSucceeds = async (execution: ReturnType<AtelierCoordinator['execute']>): Promise<void> => {
    if (execution.kind !== 'CAPTURE') throw new Error('Expected capture fixture.');
    await execution.completion;
  };
  const thenPointageRecordingFailedWithoutAdvancing = (): void => {
    expect(pupitre.echecCaptureLocale()).toBe(true);
    expect(elementsDeLaZoneFixture(designation.pointage(), 'MOULE')[0]?.isActive()).toBe(false);
  };
  const thenPointageRecordingRecoveredAndAdvanced = (): void => {
    expect(pupitre.echecCaptureLocale()).toBe(false);
    expect(designation.refusAtelier()).toBeUndefined();
    expect(elementsDeLaZoneFixture(designation.pointage(), 'MOULE')[0]?.isActive()).toBe(true);
  };
  const thenNoGestureExistsBeforeChoice = async (): Promise<void> => {
    await thenQueueHas(0);
  };
  const thenPointageUsesWorkstation = async (posteId: string): Promise<void> => {
    const pointage = (await journal.read(Entreprise.of('entreprise-a'))).evenements[0];
    expect(pointage?.geste).toMatchObject({ nature: 'POINTAGE', posteId });
  };
  const thenPendingIs = (count: number): Promise<void> => thenOldCompanyPendingIs(count);
  const thenOldCompanyPendingIs = async (count: number): Promise<void> => {
    expect((await journal.read(Entreprise.of('entreprise-a'))).evenements.filter(event => event.etat === 'EN_ATTENTE')).toHaveLength(count);
  };
  const thenActivityIs = (categorie: string): void => {
    const suivi = requiredFixture(etatHorsLigne.referentiel()?.suivis[0], 'projected workshop element');
    expect(requiredFixture(suivi.activites[0], 'projected activity').categorie).toBe(categorie);
  };
  const thenNoActivity = (): void => {
    expect(requiredFixture(etatHorsLigne.referentiel()?.suivis[0], 'projected workshop element').activites).toHaveLength(0);
  };
  const thenNatureOrderIs = async (natures: string[]): Promise<void> => {
    expect((await journal.read(Entreprise.of('entreprise-a'))).evenements.map(event => event.geste.nature)).toEqual(natures);
  };
  const thenQueueHasUniqueStableIdentities = async (): Promise<void> => {
    const gestes = (await journal.read(Entreprise.of('entreprise-a'))).evenements.map(event => event.geste);
    expect(new Set(gestes.map(geste => geste.id)).size).toBe(gestes.length);
    const premiere = requiredFixture(gestes[0], 'first activity gesture');
    const seconde = requiredFixture(gestes[1], 'second activity gesture');
    expect(premiere.dateDeSurvenue).toBe(seconde.dateDeSurvenue);
  };
  const readQueuedGestures = async (): Promise<readonly GesteDePointage[]> =>
    (await journal.read(Entreprise.of('entreprise-a'))).evenements.map(evenement => evenement.geste);
  const thenGesturesHaveDistinctIdentitiesAt = (gestes: readonly GesteDePointage[], instant: string): void => {
    const identities = gestes.map(geste => geste.id);
    expect(gestes).toHaveLength(2);
    expect(new Set(identities).size).toBe(gestes.length);
    expect(gestes.every(geste => geste.dateDeSurvenue === instant)).toBe(true);
  };
  const thenPublishedTypesAre = (types: string[]): void => {
    expect(serveur.journal.map(geste => geste.type)).toEqual(types);
  };
  const thenReplayedGesturesAre = (gestures: readonly GesteDePointage[]): void => {
    expect(serveur.journal).toEqual(gestures);
  };
  const thenGlobalIdentityWasSampledOnlyAtInitiation = (identitySourceFixture: MockInstance): void => {
    expect(identitySourceFixture).toHaveBeenCalledTimes(1);
  };
  const thenOnlyOneWindowIsAccepted = (openings: PromiseSettledResult<IdentiteOperateurDesigne>[]): string => {
    const accepted = openings.filter(result => result.status === 'fulfilled');
    const refused = openings.filter(result => result.status === 'rejected');
    expect(accepted).toHaveLength(1);
    expect(refused).toHaveLength(1);
    return requiredFixture(accepted[0], 'accepted opening').value.id;
  };
  const thenOpeningBelongsTo = (operateurId: string): void => {
    expect(serveur.journal).toEqual([expect.objectContaining({ nature: 'POINTAGE', operateurId, type: 'DEBUT' })]);
  };
  const thenOpeningAndPointageAreRefused = async (opening: Promise<unknown>, pointage: Promise<void>): Promise<void> => {
    await Promise.all([thenFails(opening, 'deja ouverte'), thenFails(pointage, 'habilitations')]);
  };
  const thenFails = async (operation: Promise<unknown>, message: string): Promise<void> => {
    await expect(operation).rejects.toThrow(message);
  };
  const thenConnectedIs = (connected: boolean): void => {
    expect(etatHorsLigne.connected()).toBe(connected);
  };
  const thenJournalIs = (gestes: GesteDePointage[]): void => {
    expect(serveur.journal).toEqual(gestes);
  };
  const thenChronologyIs = (events: string[]): void => {
    expect(serveur.chronology).toEqual(events);
  };
  const thenRefusalIs = async (code: CodeDeRefusDAtelier): Promise<void> => {
    const diagnostics = (await journal.read(Entreprise.of('entreprise-a'))).evenements.filter(event => event.etat === 'REFUSE');
    expect(diagnostics).toHaveLength(1);
    expect(requiredFixture(diagnostics[0], 'diagnostic').refus).toEqual({
      code: `urn:glm:erreur:atelier:${code}`,
      message: 'cause conservee',
      motif: code,
    });
  };
  const thenDiagnosticsCountIs = async (count: number): Promise<void> => {
    expect((await journal.read(Entreprise.of('entreprise-a'))).evenements.filter(event => event.etat === 'REFUSE')).toHaveLength(count);
  };
  const thenIdentifiantIs = (code: string): void => {
    expect(requiredFixture(etatHorsLigne.referentiel()?.operateurs[0], 'projected operator').identifiant).toBe(code);
  };
  const thenDesignatedIdentifiantIs = (code: string): void => {
    expect(designation.operateur()?.identifiant).toBe(code);
  };
  const thenNoCompanyBData = async (): Promise<void> => {
    expect(await journal.read(Entreprise.of('entreprise-b'))).toEqual(EMPTY_JOURNAL_DU_PUPITRE);
  };
  const thenNoReference = (): void => {
    expect(etatHorsLigne.referentiel()).toBeUndefined();
  };
  const thenTheWindowPresentationIsPopulated = (): void => {
    expect(designation.operateur()).toBeDefined();
    expect(designation.pointage()).toBeDefined();
    expect(pupitre.echecCaptureLocale()).toBe(true);
  };
  const readWindowPresentation = () => ({
    operateur: designation.operateur(),
    pointage: designation.pointage(),
    echecLocal: pupitre.echecCaptureLocale(),
    refus: designation.refusAtelier(),
  });
  const thenNoWindowPresentationRemains = (presentation = readWindowPresentation()): void => {
    expect(presentation.operateur).toBeUndefined();
    expect(presentation.pointage).toBeUndefined();
    expect(presentation.echecLocal).toBe(false);
    expect(presentation.refus).toBeUndefined();
  };
  const thenGestureNeedsAWindow = (failure: unknown): void => {
    expect(failure).toBeInstanceOf(Error);
    if (failure instanceof Error) {
      expect(failure.message).toContain('Aucune fenetre');
    }
  };
  const givenDigitsEntered = (digits: string): void => {
    for (const char of digits) {
      designation.enterDigit(char);
    }
  };
  const givenFailedLocalSemanticCapture = async (): Promise<void> => {
    givenLocalWriteFailsOnce();
    const failed = whenPressingPrimaryTarget();
    await thenSemanticCaptureFails(failed);
  };
  const givenServerRefusalOnStart = async (posteId: string): Promise<void> => {
    givenAuthorizedAccess();
    givenServerFailures(refusalFixture('suivi-d-atelier-cloture'));
    await whenStartingOn(posteId);
    await whenSynchronizing();
  };
  const givenBackgroundSynchronizationFails = (): void => {
    vi.spyOn(journal, 'synchronize').mockRejectedValueOnce(new Error('stockage indisponible'));
  };
  const whenValidating = (): Promise<void> => designation.validate();
  const thenValidationIsAvailable = (expected: boolean): void => {
    expect(designation.canValidate()).toBe(expected);
  };
  const thenPointageIsDefined = (): void => {
    expect(designation.pointage()).toBeDefined();
  };
  const thenWorkshopMessageIsDefined = (): void => {
    expect(designation.refusAtelier()).toBeDefined();
  };
  const thenWorkshopMessageIsCleared = (presentation = readWindowPresentation()): void => {
    expect(presentation.echecLocal).toBe(false);
    expect(presentation.refus).toBeUndefined();
  };
  const thenChoiceRequiresWorkstation = (choice: ReturnType<AtelierCoordinator['execute']>): void => {
    expect(choice.kind).toBe('CHOIX_POSTE_REQUIS');
  };
  const thenInactivityDeadlineWasRenewed = (initialDeadline: number | undefined): void => {
    const renewedDeadline = scheduler.scheduledDeadlines.at(-1);
    expect(renewedDeadline).toBeDefined();
    if (haveComparableDeadlines(initialDeadline, renewedDeadline)) {
      expect(renewedDeadline).toBeGreaterThan(initialDeadline);
    }
  };
  const thenBackgroundSynchronizationInterruptionWasReported = (): void => {
    expect(errorHandler.errors).toEqual([expect.any(Error)]);
  };

  const completionOf = (execution: ReturnType<AtelierCoordinator['execute']>): Promise<void> => {
    if (execution.kind !== 'CAPTURE') throw new Error('Expected immediate capture fixture.');
    return execution.completion;
  };
});
