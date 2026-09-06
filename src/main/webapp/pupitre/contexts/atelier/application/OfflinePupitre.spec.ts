import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { DesignationExpirationSchedulerPort } from '@/pupitre/contexts/atelier/domain/designation/DesignationExpirationSchedulerPort';
import { IdentiteOperateurDesigne } from '@/pupitre/contexts/atelier/domain/designation/FenetreOperateur';
import {
  EMPTY_JOURNAL_DU_PUPITRE,
  GesteDAtelier,
  ReferentielDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { CODES_DE_REFUS_D_ATELIER } from '@/pupitre/contexts/atelier/domain/refus/RefusDAtelier';
import { RefusDePublication } from '@/pupitre/contexts/atelier/domain/refus/RefusDePublication';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { Injector } from '@angular/core';
import { JournauxDuPupitreFixture } from '@test/unit/fixtures/pupitre/atelier/JournauxDuPupitreFixture';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { AcceptationLocaleDesGestes } from './AcceptationLocaleDesGestes';
import { EtatHorsLigneDuPupitre } from './EtatHorsLigneDuPupitre';
import { OfflinePupitre } from './OfflinePupitre';
import { PupitreSynchronization } from './PupitreSynchronization';

const roundTrip = (): Promise<void> => new Promise(resolve => setTimeout(resolve));
const referenceFixture: ReferentielDuPupitre = {
  operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [{ id: 'tour', libelle: 'Tour' }] }],
  suivis: [{ id: 'piece', nom: 'OF-1', type: 'PRODUIT', etat: 'EN_ATTENTE', activites: [], evenements: [] }],
};
const arriveeFixture: GesteDAtelier = { nature: 'ARRIVEE', id: 'arrivee', dateDeSurvenue: '2026-09-05T08:00:00Z', operateurId: 'jean' };
const refusalFixture = (code: string): RefusDePublication =>
  new RefusDePublication(
    `urn:glm:erreur:atelier:${code}`,
    'cause conservee',
    CODES_DE_REFUS_D_ATELIER.find(candidate => candidate === code),
  );

interface SynchronizationBarrier {
  readonly started: Promise<void>;
  readonly release: () => void;
  signalStarted(): void;
  wait(): Promise<void>;
}

const synchronizationBarrier = (): SynchronizationBarrier => {
  let signalStarted: (() => void) | undefined;
  let release: (() => void) | undefined;
  const started = new Promise<void>(resolve => {
    signalStarted = resolve;
  });
  const waiting = new Promise<void>(resolve => {
    release = resolve;
  });
  if (signalStarted === undefined || release === undefined) throw new Error('Synchronization barrier is not initialized.');
  return { started, signalStarted, release, wait: () => waiting };
};

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
  override schedule(): void {
    return;
  }
}

class ServerFixture extends AtelierExchangePort {
  reference = structuredClone(referenceFixture);
  failures: (Error | undefined)[] = [];
  cacheFailure: Error | undefined;
  readonly journal: GesteDAtelier[] = [];
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
  override async send(geste: GesteDAtelier): Promise<void> {
    await roundTrip();
    this.chronology.push(geste.id);
    this.beforeSend?.();
    this.beforeSend = undefined;
    const failure = this.failures.shift();
    if (failure !== undefined) {
      throw failure;
    }
    this.journal.push(structuredClone(geste));
  }
  override async reread(): Promise<void> {
    await roundTrip();
    this.chronology.push('relecture');
    this.afterReread?.();
  }
}

describe('OfflinePupitre', () => {
  let pupitre: OfflinePupitre;
  let journal: JournauxDuPupitreFixture;
  let serveur: ServerFixture;
  let authentication: AuthenticationFixture;

  beforeEach(async () => {
    journal = new JournauxDuPupitreFixture();
    serveur = new ServerFixture();
    authentication = new AuthenticationFixture();
    await givenCachedReference(referenceFixture);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
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
    await thenQueueHas(3);
  });

  it('should commit arrival and implicit resumption before the first activity, only once per window', async () => {
    await givenAnOpenWindow();

    await whenStartingAndReportingNonConformity();
    await whenPausing();

    await thenNatureOrderIs(['ARRIVEE', 'PRESENCE', 'POINTAGE', 'POINTAGE', 'PRESENCE']);
    thenActivityIs('NON_CONFORMITE');
    await thenQueueHasUniqueStableIdentities();
  });

  it('should reject a gesture explicitly if local commit fails and accept the next retry durably', async () => {
    await givenAnOpenWindow();
    givenLocalWriteFailsOnce();

    const failedStart = whenStarting();

    await thenFails(failedStart, 'disque plein');
    await thenQueueHas(0);
    thenNoActivity();

    await whenStarting();

    await thenQueueHas(3);
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

    const choice = whenPressingPrimaryTarget();

    await thenNoGestureExistsBeforeChoice();
    await whenChoosingWorkstation(choice, 'fraiseuse');

    await thenPointageUsesWorkstation('fraiseuse');
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

  it('should retain the failed push and replay exactly the same identifiers and dates on reconnection', async () => {
    await givenPendingArrival();
    givenAuthorizedAccess();
    givenServerFailures(new Error('reseau absent'));

    await whenSynchronizing();

    thenConnectedIs(false);
    await thenPendingIs(1);

    await whenSynchronizing();

    thenConnectedIs(true);
    thenJournalIs([arriveeFixture]);
  });

  it('should replay a server acceptance whose local acknowledgement was interrupted', async () => {
    await givenPendingArrival();
    givenAuthorizedAccess();
    givenAcknowledgementFailsOnce();

    const failedSynchronization = whenSynchronizing();

    await thenFails(failedSynchronization, 'disque plein');
    await thenPendingIs(1);

    await whenSynchronizing();

    thenJournalIs([arriveeFixture, arriveeFixture]);
    await thenPendingIs(0);
  });

  it('should preserve a final refusal with its cause and continue subsequent gestures for the same operator', async () => {
    await givenWorkStartedOffline();
    givenAuthorizedAccess();
    givenServerFailures(undefined, undefined, refusalFixture('suivi-d-atelier-cloture'));

    await whenSynchronizing();

    thenNoActivity();

    await whenDeparting();
    await whenSynchronizing();
    await whenClosing();

    thenNoActivity();
    await thenPendingIs(0);
    await thenRefusalIs('suivi-d-atelier-cloture');
  });

  it('should absorb only an existing arrival and an implicitly resumed presence', async () => {
    await givenResumedWorkOffline();
    givenAuthorizedAccess();
    givenServerFailures(
      refusalFixture('journee-de-travail-deja-ouverte'),
      refusalFixture('transition-de-presence-interdite'),
      undefined,
      refusalFixture('transition-de-presence-interdite'),
    );

    await whenSynchronizing();

    await thenPendingIs(0);
    await thenRefusalIs('transition-de-presence-interdite');
  });

  it('should absorb an explicit resumption refusal after restart when its correlated arrival opened the day', async () => {
    await givenAnOpenWindow();
    await pupitre.recordPresence('REPRISE');
    await whenSynchronizing();
    givenAuthorizedAccess();
    givenServerFailures(undefined, new Error('reseau absent'));

    await whenSynchronizing();

    pupitre = buildPupitre();
    await pupitre.restore();
    givenServerFailures(refusalFixture('transition-de-presence-interdite'));

    await whenSynchronizing();

    await thenPendingIs(0);
    await thenDiagnosticsCountIs(0);
  });

  it('should retain an explicit resumption refusal after restart when arrival assurance found an open day', async () => {
    await givenAnOpenWindow();
    await pupitre.recordPresence('REPRISE');
    await whenSynchronizing();
    givenAuthorizedAccess();
    givenServerFailures(refusalFixture('journee-de-travail-deja-ouverte'), new Error('reseau absent'));

    await whenSynchronizing();
    await thenArrivalOpenedDay(false);
    await thenPendingIs(1);

    pupitre = buildPupitre();
    await pupitre.restore();
    givenServerFailures(refusalFixture('transition-de-presence-interdite'));

    await whenSynchronizing();

    await thenPendingIs(0);
    await thenRefusalIs('transition-de-presence-interdite');
  });

  it('should reread before retrying a concurrent gesture with its original body', async () => {
    await givenPendingArrival();
    givenAuthorizedAccess();
    givenServerFailures(refusalFixture('saisie-concurrente'));

    await whenSynchronizing();

    thenChronologyIs(['arrivee', 'relecture', 'arrivee']);
    thenJournalIs([arriveeFixture]);
  });

  it('should preserve a repeated race as a final diagnostic after rereading and retrying', async () => {
    await givenPendingArrival();
    givenAuthorizedAccess();
    givenServerFailures(refusalFixture('saisie-concurrente'), refusalFixture('saisie-concurrente'));

    await whenSynchronizing();

    await thenPendingIs(0);
    thenConnectedIs(true);
    await thenRefusalIs('saisie-concurrente');
  });

  it('should apply the contextual allowlist to the response after a reread as well', async () => {
    await givenPendingArrival();
    givenAuthorizedAccess();
    givenServerFailures(refusalFixture('saisie-concurrente'), refusalFixture('journee-de-travail-deja-ouverte'));

    await whenSynchronizing();

    await thenPendingIs(0);
  });

  it('should reconcile a refreshed referential while retaining the designated operator', async () => {
    await givenAnOpenWindow();
    givenAuthorizedAccess();
    givenRefreshedMatricule('050');

    await whenSynchronizing();

    thenMatriculeIs('050');
    thenDesignatedMatriculeIs('049');

    await whenClosing();

    thenMatriculeIs('050');
  });

  it('should retain the last complete cache through failed refreshes without a time limit', async () => {
    givenAuthorizedAccess();
    givenReferenceRefreshFails();

    await whenSynchronizing();

    thenMatriculeIs('049');
    thenConnectedIs(true);
  });

  it('should suspend the old company queue and reject an active window after reenrolment', async () => {
    await givenWorkStartedOffline();
    givenReenrolledForAnotherCompany();

    const failedStart = whenStarting();

    await thenFails(failedStart, 'fenetre operateur a change');

    await whenSynchronizing();

    await thenOldCompanyPendingIs(3);
    thenJournalIs([]);

    const unknownOpening = whenOpeningMatricule('inconnu');

    await thenFails(unknownOpening, 'Matricule absent');
  });

  it('should clear every operator presentation when restoring another company', async () => {
    await givenWorkStartedOffline();
    givenLocalWriteFailsOnce();
    const failedStop = whenStarting();
    await thenFails(failedStop, 'disque plein');
    givenAuthorizedAccess();
    givenServerFailures(undefined, undefined, refusalFixture('suivi-d-atelier-cloture'));
    await whenSynchronizing();
    thenTheWindowPresentationIsPopulated();

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
    await givenPendingArrival();
    givenAuthorizedAccess();
    givenServerFailures(refusalFixture('saisie-concurrente'));
    givenCompanyChangesDuringReread();

    await whenSynchronizing();

    thenJournalIs([]);
    await thenOldCompanyPendingIs(1);
  });

  it('should finish acknowledging the old company response without sending its next event under another token', async () => {
    await givenPendingArrival();
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

    await thenQueueHas(4);
    await thenPendingIs(0);
  });

  it('should accept only one concurrent operator opening and keep that operator for the next gesture', async () => {
    await givenTwoOperators();

    const openings = await whenOpeningBothOperators();

    const acceptedOperator = thenOnlyOneWindowIsAccepted(openings);

    await whenPausing();
    givenAuthorizedAccess();
    await whenSynchronizing();

    thenPresenceBelongsTo(acceptedOperator);
  });

  it('should reject unknown codes, overlapping windows and unauthorized workstations', async () => {
    const unknownOpening = whenOpeningMatricule('inconnu');

    await thenFails(unknownOpening, 'Matricule absent');

    await givenAMultiWorkstationOpenWindow();

    const overlappingOpening = whenOpening();
    const unauthorizedPointage = whenStartingOn('interdit');

    await thenOpeningAndPointageAreRefused(overlappingOpening, unauthorizedPointage);

    await thenQueueHas(0);
  });

  it('should clear the exposed reference when the durable company selection disappears', async () => {
    await givenRestoredPupitre();

    thenMatriculeIs('049');

    givenNoCompanySelected();

    await whenSynchronizing();

    thenNoReference();
  });

  it('should require an initial enrolment and an operator window', async () => {
    givenNoCompanySelected();

    await whenRestoring();
    const opening = whenOpening();

    await thenFails(opening, 'enrole');

    thenNoReference();

    const pausing = await whenPausingWithoutWindow();

    thenGestureNeedsAWindow(pausing);
  });

  it('should reject a window when the company changes while restoring it', async () => {
    givenCompanyChangesDuringRestore();

    const opening = whenOpening();

    await thenFails(opening, 'entreprise du pupitre a change');
  });

  it('should expose an empty diagnostic before any gesture or reference exists', async () => {
    givenEmptyCompanySelected();

    await whenRestoring();

    thenNoReference();

    const opening = whenOpening();

    await thenFails(opening, 'Matricule absent');
    await thenDiagnosticsCountIs(0);
  });

  it('should contain a background synchronization failure after the gesture was durably accepted', async () => {
    await givenAnOpenWindow();
    givenAuthorizedAccess();
    givenAcknowledgementFailsOnce();

    await whenStarting();
    const failedSynchronization = whenSynchronizing();

    await thenFails(failedSynchronization, 'disque plein');

    await whenRestarting();

    await thenQueueHas(3);
  });

  it('should push a gesture accepted while the reference is being refreshed without waiting for the next minute', async () => {
    await givenAnOpenWindow();
    givenAuthorizedAccess();
    givenPauseIsAppendedDuringReferenceRefresh();

    await whenSynchronizing();
    await whenClosing();

    await thenQueueHas(2);
    await thenPendingIs(0);
  });

  it('should durably retain a pointage started before expiry while refusing subsequent gestures during closure', async () => {
    givenBusinessTime();
    await givenAnOpenWindow();
    const releaseCapture = givenDelayedCapture();

    const pointage = whenStarting();
    whenSleepingPastDesignation();
    const closing = whenExpiring();

    thenGestureIsRefusedDuringClosure();

    whenReleasingCapture(releaseCapture);
    await whenCaptureAndClosureComplete(pointage, closing);

    await thenQueueHas(3);
    await thenPointageKeepsItsOriginalOperatorAndTime();
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

    await thenOldCompanyPendingIs(3);
    thenNoWindowPresentationRemains();
    expect(pupitre.erreurAtelier()).toBeUndefined();
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
    expect(pupitre.erreurAtelier()).toBeUndefined();
  });

  const givenBusinessTime = (): void => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-05T08:00:00Z'));
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
  const whenExpiring = (): Promise<void> => pupitre.expire();
  const whenReleasingCapture = (release: () => void): void => {
    release();
  };
  const whenCaptureAndClosureComplete = async (pointage: Promise<void>, closing: Promise<void>): Promise<void> => {
    await Promise.all([pointage, closing]);
  };
  const thenGestureIsRefusedDuringClosure = (): void => {
    expect(() => pupitre.execute({ suiviId: 'piece', cible: 'PRINCIPALE' })).toThrow('Aucune fenetre operateur ouverte.');
  };
  const thenPointageKeepsItsOriginalOperatorAndTime = async (): Promise<void> => {
    const gestes = (await journal.read('entreprise-a')).evenements.map(evenement => evenement.geste);
    expect(gestes).toContainEqual(
      expect.objectContaining({ nature: 'POINTAGE', operateurId: 'jean', dateDeSurvenue: '2026-09-05T08:00:00.000Z' }),
    );
  };

  const buildPupitre = (): OfflinePupitre =>
    Injector.create({
      providers: [
        AcceptationLocaleDesGestes,
        EtatHorsLigneDuPupitre,
        OfflinePupitre,
        PupitreSynchronization,
        { provide: JournauxDuPupitrePort, useValue: journal },
        { provide: AtelierExchangePort, useValue: serveur },
        { provide: AuthenticationPort, useValue: authentication },
        { provide: DesignationExpirationSchedulerPort, useClass: DesignationExpirationSchedulerFixture },
      ],
    }).get(OfflinePupitre);
  const whenRestarting = async (): Promise<void> => {
    await pupitre.synchronize();
    pupitre = buildPupitre();
    await pupitre.restore();
  };
  const whenOpening = (): Promise<unknown> => pupitre.openWindow('049');
  const whenOpeningMatricule = (matricule: string): Promise<unknown> => pupitre.openWindow(matricule);
  const whenOpeningBothOperators = (): Promise<PromiseSettledResult<IdentiteOperateurDesigne>[]> =>
    Promise.allSettled([pupitre.openWindow('049'), pupitre.openWindow('050')]);
  const whenStarting = (): Promise<void> => completionOf(pupitre.execute({ suiviId: 'piece', cible: 'PRINCIPALE' }));
  const whenPressingPrimaryTarget = (): ReturnType<OfflinePupitre['execute']> => pupitre.execute({ suiviId: 'piece', cible: 'PRINCIPALE' });
  const whenChoosingWorkstation = async (execution: ReturnType<OfflinePupitre['execute']>, posteId: string): Promise<void> => {
    if (execution.kind !== 'CHOIX_POSTE_REQUIS') throw new Error('Expected workstation choice fixture.');
    await execution.choose(posteId);
  };
  const whenChoosingWorkstationLater = (execution: ReturnType<OfflinePupitre['execute']>, posteId: string): Promise<void> =>
    Promise.resolve().then(() => whenChoosingWorkstation(execution, posteId));
  const whenStartingOn = (posteId: string): Promise<void> => {
    const execution = pupitre.execute({ suiviId: 'piece', cible: 'PRINCIPALE' });
    if (execution.kind === 'CHOIX_POSTE_REQUIS') return Promise.resolve().then(() => execution.choose(posteId));
    return execution.completion;
  };
  const whenStartingAndReportingNonConformity = async (): Promise<void> => {
    await Promise.all([whenStarting(), completionOf(pupitre.execute({ suiviId: 'piece', cible: 'SECONDAIRE' }))]);
  };
  const whenPausing = (): Promise<void> => pupitre.recordPresence('PAUSE');
  const whenDeparting = (): Promise<void> => pupitre.recordPresence('DEPART');
  const whenSynchronizing = (): Promise<void> => pupitre.synchronize();
  const whenSynchronizingConcurrently = async (): Promise<void> => {
    await Promise.all([pupitre.synchronize(), pupitre.synchronize()]);
  };
  const whenClosing = (): Promise<void> => pupitre.finish();
  const whenRestoring = (): Promise<void> => pupitre.restore();
  const whenPausingWithoutWindow = async (): Promise<unknown> => {
    try {
      await whenPausing();
      return undefined;
    } catch (failure) {
      return failure;
    }
  };
  const givenCachedReference = async (reference: ReferentielDuPupitre): Promise<void> => {
    await journal.saveReferentiel('entreprise-a', structuredClone(reference));
  };
  const givenAnOpenWindow = async (): Promise<void> => {
    await pupitre.openWindow('049');
  };
  const givenAMultiWorkstationOpenWindow = async (): Promise<void> => {
    const operateur = requiredFixture(referenceFixture.operateurs[0], 'operator');
    await givenCachedReference({
      ...referenceFixture,
      operateurs: [{ ...operateur, postes: [...operateur.postes, { id: 'fraiseuse', libelle: 'Fraiseuse' }] }],
    });
    await givenAnOpenWindow();
  };
  const givenWorkStartedOffline = async (): Promise<void> => {
    await givenAnOpenWindow();
    await whenStarting();
  };
  const givenResumedWorkOffline = async (): Promise<void> => {
    await givenWorkStartedOffline();
    await pupitre.recordPresence('REPRISE');
  };
  const givenRestoredPupitre = async (): Promise<void> => {
    await pupitre.restore();
  };
  const givenPendingArrival = async (): Promise<void> => {
    await journal.append('entreprise-a', [arriveeFixture]);
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
  const givenRefreshedMatricule = (matricule: string): void => {
    const operateur = requiredFixture(serveur.reference.operateurs[0], 'server operator');
    serveur.reference = { ...serveur.reference, operateurs: [{ ...operateur, matricule }] };
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
      void pupitre.recordPresence('PAUSE');
    };
  };
  const givenTwoOperators = async (): Promise<void> => {
    await journal.saveReferentiel('entreprise-a', {
      ...referenceFixture,
      operateurs: [...referenceFixture.operateurs, { id: 'marie', nom: 'Martin', prenom: 'Marie', matricule: '050', postes: [] }],
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
  const givenPauseIsAppendedDuringReferenceRefresh = (): void => {
    serveur.afterReference = () => {
      serveur.afterReference = undefined;
      void pupitre.recordPresence('PAUSE');
    };
  };
  const thenQueueHas = async (count: number): Promise<void> => {
    expect((await journal.read('entreprise-a')).evenements).toHaveLength(count);
  };
  const thenArrivalOpenedDay = async (expected: boolean): Promise<void> => {
    const arrival = (await journal.read('entreprise-a')).evenements.find(evenement => evenement.geste.nature === 'ARRIVEE');
    expect(arrival).toMatchObject({ etat: 'ACCEPTE', journeeOuverte: expected });
  };
  const thenSemanticCaptureFails = async (execution: ReturnType<OfflinePupitre['execute']>): Promise<void> => {
    if (execution.kind !== 'CAPTURE') throw new Error('Expected capture fixture.');
    await expect(execution.completion).rejects.toThrow('disque plein');
  };
  const thenSemanticCaptureSucceeds = async (execution: ReturnType<OfflinePupitre['execute']>): Promise<void> => {
    if (execution.kind !== 'CAPTURE') throw new Error('Expected capture fixture.');
    await execution.completion;
  };
  const thenPointageRecordingFailedWithoutAdvancing = (): void => {
    expect(pupitre.erreurAtelier()).toBe('Action non enregistrée — recommencez');
    expect(pupitre.pointage()?.moules[0]?.isActive()).toBe(false);
  };
  const thenPointageRecordingRecoveredAndAdvanced = (): void => {
    expect(pupitre.erreurAtelier()).toBeUndefined();
    expect(pupitre.pointage()?.moules[0]?.isActive()).toBe(true);
  };
  const thenNoGestureExistsBeforeChoice = async (): Promise<void> => {
    await thenQueueHas(0);
  };
  const thenPointageUsesWorkstation = async (posteId: string): Promise<void> => {
    const pointage = (await journal.read('entreprise-a')).evenements.find(evenement => evenement.geste.nature === 'POINTAGE');
    expect(pointage?.geste).toMatchObject({ nature: 'POINTAGE', posteId });
  };
  const thenPendingIs = (count: number): Promise<void> => thenOldCompanyPendingIs(count);
  const thenOldCompanyPendingIs = async (count: number): Promise<void> => {
    expect((await journal.read('entreprise-a')).evenements.filter(event => event.etat === 'EN_ATTENTE')).toHaveLength(count);
  };
  const thenActivityIs = (categorie: string): void => {
    const suivi = requiredFixture(pupitre.referentiel()?.suivis[0], 'projected workshop element');
    expect(requiredFixture(suivi.activites[0], 'projected activity').categorie).toBe(categorie);
  };
  const thenNoActivity = (): void => {
    expect(requiredFixture(pupitre.referentiel()?.suivis[0], 'projected workshop element').activites).toHaveLength(0);
  };
  const thenNatureOrderIs = async (natures: string[]): Promise<void> => {
    expect((await journal.read('entreprise-a')).evenements.map(event => event.geste.nature)).toEqual(natures);
  };
  const thenQueueHasUniqueStableIdentities = async (): Promise<void> => {
    const gestes = (await journal.read('entreprise-a')).evenements.map(event => event.geste);
    expect(new Set(gestes.map(geste => geste.id)).size).toBe(gestes.length);
    const first = requiredFixture(gestes[0], 'first queued gesture');
    const second = requiredFixture(gestes[1], 'second queued gesture');
    const third = requiredFixture(gestes[2], 'third queued gesture');
    expect(first.dateDeSurvenue).toBe(third.dateDeSurvenue);
    expect(second.dateDeSurvenue).toBe(third.dateDeSurvenue);
  };
  const thenOnlyOneWindowIsAccepted = (openings: PromiseSettledResult<IdentiteOperateurDesigne>[]): string => {
    const accepted = openings.filter(result => result.status === 'fulfilled');
    const refused = openings.filter(result => result.status === 'rejected');
    expect(accepted).toHaveLength(1);
    expect(refused).toHaveLength(1);
    return requiredFixture(accepted[0], 'accepted opening').value.id;
  };
  const thenPresenceBelongsTo = (operateurId: string): void => {
    expect(serveur.journal.filter(geste => geste.nature === 'PRESENCE')).toEqual([
      expect.objectContaining({ nature: 'PRESENCE', operateurId, type: 'PAUSE', implicite: false }),
    ]);
  };
  const thenOpeningAndPointageAreRefused = async (opening: Promise<unknown>, pointage: Promise<void>): Promise<void> => {
    await Promise.all([thenFails(opening, 'deja ouverte'), thenFails(pointage, 'habilitations')]);
  };
  const thenFails = async (operation: Promise<unknown>, message: string): Promise<void> => {
    await expect(operation).rejects.toThrow(message);
  };
  const thenConnectedIs = (connected: boolean): void => {
    expect(pupitre.connected()).toBe(connected);
  };
  const thenJournalIs = (gestes: GesteDAtelier[]): void => {
    expect(serveur.journal).toEqual(gestes);
  };
  const thenChronologyIs = (events: string[]): void => {
    expect(serveur.chronology).toEqual(events);
  };
  const thenRefusalIs = async (code: string): Promise<void> => {
    const diagnostics = await pupitre.diagnostics();
    expect(diagnostics).toHaveLength(1);
    expect(requiredFixture(diagnostics[0], 'diagnostic').refus).toEqual({
      code: `urn:glm:erreur:atelier:${code}`,
      message: 'cause conservee',
    });
  };
  const thenDiagnosticsCountIs = async (count: number): Promise<void> => {
    expect(await pupitre.diagnostics()).toHaveLength(count);
  };
  const thenMatriculeIs = (code: string): void => {
    expect(requiredFixture(pupitre.referentiel()?.operateurs[0], 'projected operator').matricule).toBe(code);
  };
  const thenDesignatedMatriculeIs = (code: string): void => {
    expect(pupitre.operateur()?.matricule).toBe(code);
  };
  const thenNoCompanyBData = async (): Promise<void> => {
    expect(await journal.read('entreprise-b')).toEqual(EMPTY_JOURNAL_DU_PUPITRE);
  };
  const thenNoReference = (): void => {
    expect(pupitre.referentiel()).toBeUndefined();
  };
  const thenTheWindowPresentationIsPopulated = (): void => {
    expect(pupitre.operateur()).toBeDefined();
    expect(pupitre.pointage()).toBeDefined();
    expect(pupitre.refusAtelier()).toEqual({ contexte: 'OF-1', message: 'cause conservee' });
    expect(pupitre.erreurAtelier()).toBe('Action non enregistrée — recommencez');
  };
  const thenNoWindowPresentationRemains = (): void => {
    expect(pupitre.operateur()).toBeUndefined();
    expect(pupitre.pointage()).toBeUndefined();
    expect(pupitre.refusAtelier()).toBeUndefined();
    expect(pupitre.erreurAtelier()).toBeUndefined();
  };
  const thenGestureNeedsAWindow = (failure: unknown): void => {
    expect(failure).toBeInstanceOf(Error);
    if (failure instanceof Error) {
      expect(failure.message).toContain('Aucune fenetre');
    }
  };
  const completionOf = (execution: ReturnType<OfflinePupitre['execute']>): Promise<void> => {
    if (execution.kind !== 'CAPTURE') throw new Error('Expected immediate capture fixture.');
    return execution.completion;
  };
});
