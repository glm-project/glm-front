import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { DesignationExpirationSchedulerPort } from '@/pupitre/contexts/atelier/domain/designation/DesignationExpirationSchedulerPort';
import {
  EMPTY_PUPITRE,
  LocalGeste,
  OperateurDuPupitre,
  ReferentielDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal/LocalPupitreState';
import { PupitreJournalPort } from '@/pupitre/contexts/atelier/domain/journal/PupitreJournalPort';
import { PupitreServerPort } from '@/pupitre/contexts/atelier/domain/journal/PupitreServerPort';
import { CODES_DE_REFUS_D_ATELIER } from '@/pupitre/contexts/atelier/domain/refus/RefusDAtelier';
import { RefusDuPupitre } from '@/pupitre/contexts/atelier/domain/refus/RefusDuPupitre';
import { Injector } from '@angular/core';
import { PupitreJournalFixture } from '@test/unit/fixtures/pupitre/atelier/PupitreJournalFixture';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { OfflinePupitre } from './OfflinePupitre';
import { PupitreSynchronization } from './PupitreSynchronization';

const roundTrip = (): Promise<void> => new Promise(resolve => setTimeout(resolve));
const referenceFixture: ReferentielDuPupitre = {
  operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [{ id: 'tour', libelle: 'Tour' }] }],
  suivis: [{ id: 'piece', nom: 'OF-1', type: 'PRODUIT', etat: 'EN_ATTENTE', activites: [], evenements: [] }],
};
const arriveeFixture: LocalGeste = { nature: 'ARRIVEE', id: 'arrivee', dateDeSurvenue: '2026-09-05T08:00:00Z', operateurId: 'jean' };
const refusalFixture = (code: string): RefusDuPupitre =>
  new RefusDuPupitre(
    `urn:glm:erreur:atelier:${code}`,
    'cause conservee',
    CODES_DE_REFUS_D_ATELIER.find(candidate => candidate === code),
  );

class AuthenticationFixture extends AuthenticationPort {
  tenant: string | undefined = 'entreprise-a';
  token: string | undefined;
  pendingSynchronization: Promise<void> | undefined;

  override async synchronizeSession(): Promise<void> {
    await roundTrip();
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
}

class DesignationExpirationSchedulerFixture extends DesignationExpirationSchedulerPort {
  override schedule(): void {
    return;
  }
}

class ServerFixture extends PupitreServerPort {
  reference = structuredClone(referenceFixture);
  failures: (Error | undefined)[] = [];
  cacheFailure: Error | undefined;
  readonly journal: LocalGeste[] = [];
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
  override async send(geste: LocalGeste): Promise<void> {
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
  let journal: PupitreJournalFixture;
  let serveur: ServerFixture;
  let authentication: AuthenticationFixture;

  beforeEach(async () => {
    journal = new PupitreJournalFixture();
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

    thenActivityIs('TRAVAIL');

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

  it('should never activate a refreshed referential under the operator’s fingers', async () => {
    await givenAnOpenWindow();
    givenAuthorizedAccess();
    givenRefreshedMatricule('050');

    await whenSynchronizing();

    thenMatriculeIs('049');

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

    await whenOpening();

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

    const pausing = whenPausingWithoutWindow();

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

    thenGestureIsRefusedDuringClosure();

    whenReleasingCapture(releaseCapture);
    await whenCaptureAndClosureComplete(pointage, closing);

    await thenQueueHas(3);
    await thenPointageKeepsItsOriginalOperatorAndTime();
  });

  const givenBusinessTime = (): void => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-05T08:00:00Z'));
  };
  const givenDelayedCapture = (): (() => void) => {
    let release!: () => void;
    authentication.pendingSynchronization = new Promise(resolve => {
      release = resolve;
    });
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
    expect(() => pupitre.recordPointage({ suiviId: 'piece', type: 'DEBUT' })).toThrow('Aucune fenetre operateur ouverte.');
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
        OfflinePupitre,
        PupitreSynchronization,
        { provide: PupitreJournalPort, useValue: journal },
        { provide: PupitreServerPort, useValue: serveur },
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
  const whenOpeningBothOperators = (): Promise<PromiseSettledResult<OperateurDuPupitre>[]> =>
    Promise.allSettled([pupitre.openWindow('049'), pupitre.openWindow('050')]);
  const whenStarting = (): Promise<void> => pupitre.recordPointage({ suiviId: 'piece', type: 'DEBUT', posteId: 'tour' });
  const whenStartingOn = (posteId: string): Promise<void> => pupitre.recordPointage({ suiviId: 'piece', type: 'DEBUT', posteId });
  const whenStartingAndReportingNonConformity = async (): Promise<void> => {
    await Promise.all([whenStarting(), pupitre.recordPointage({ suiviId: 'piece', type: 'NON_CONFORMITE', posteId: 'tour' })]);
  };
  const whenPausing = (): Promise<void> => pupitre.recordPresence('PAUSE');
  const whenDeparting = (): Promise<void> => pupitre.recordPresence('DEPART');
  const whenSynchronizing = (): Promise<void> => pupitre.synchronize();
  const whenSynchronizingConcurrently = async (): Promise<void> => {
    await Promise.all([pupitre.synchronize(), pupitre.synchronize()]);
  };
  const whenClosing = (): Promise<void> => pupitre.finish();
  const whenRestoring = (): Promise<void> => pupitre.restore();
  const whenPausingWithoutWindow = (): unknown => {
    try {
      void whenPausing();
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
  const givenWorkStartedOffline = async (): Promise<void> => {
    await givenAnOpenWindow();
    await pupitre.recordPointage({ suiviId: 'piece', type: 'DEBUT', posteId: 'tour' });
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
    requiredFixture(serveur.reference.operateurs[0], 'server operator').matricule = matricule;
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
    const reference = structuredClone(referenceFixture);
    reference.operateurs.push({ id: 'marie', nom: 'Martin', prenom: 'Marie', matricule: '050', postes: [] });
    await journal.saveReferentiel('entreprise-a', reference);
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
  const thenOnlyOneWindowIsAccepted = (openings: PromiseSettledResult<OperateurDuPupitre>[]): string => {
    const accepted = openings.filter(result => result.status === 'fulfilled');
    const refused = openings.filter(result => result.status === 'rejected');
    expect(accepted).toHaveLength(1);
    expect(refused).toHaveLength(1);
    return requiredFixture(accepted[0], 'accepted opening').value.id;
  };
  const thenPresenceBelongsTo = (operateurId: string): void => {
    expect(serveur.journal).toEqual([expect.objectContaining({ nature: 'PRESENCE', operateurId, type: 'PAUSE', implicite: false })]);
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
  const thenJournalIs = (gestes: LocalGeste[]): void => {
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
  const thenNoCompanyBData = async (): Promise<void> => {
    expect(await journal.read('entreprise-b')).toEqual(EMPTY_PUPITRE);
  };
  const thenNoReference = (): void => {
    expect(pupitre.referentiel()).toBeUndefined();
  };
  const thenGestureNeedsAWindow = (failure: unknown): void => {
    expect(failure).toBeInstanceOf(Error);
    if (failure instanceof Error) {
      expect(failure.message).toContain('Aucune fenetre');
    }
  };
});
