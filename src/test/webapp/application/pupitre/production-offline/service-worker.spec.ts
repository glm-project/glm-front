import type { GesteDAtelier, ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';

import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';
import type { ProductionPupitreFixture } from './fixtures/main';

const entrepriseFixture = 'entreprise-a';
const dateFixture = '2026-09-05T08:00:00Z';
const idFixture = '59ef737b-c3dd-47f8-8e63-4d5526a17df3';
const tokenFixture = `fixture.${btoa(JSON.stringify({ tenant: entrepriseFixture })).replaceAll('=', '')}.signature`;
const gestureFixture: GesteDAtelier = {
  nature: 'ARRIVEE',
  id: idFixture,
  dateDeSurvenue: dateFixture,
  operateurId: 'operator-1',
};
const acceptedGestureFixture = { geste: gestureFixture, etat: 'ACCEPTE', journeeOuverte: true } as const;
const referenceFixture: ReferentielDuPupitre = {
  operateurs: [{ id: 'operator-1', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [] }],
  suivis: [
    {
      id: 'workshop-item-1',
      nom: 'OF-1',
      etat: 'EN_ATTENTE',
      type: 'PRODUIT',
      activites: [],
      evenements: [],
    },
  ],
};
let serviceWorkerSessions: string[] = [];

interface ServerStateFixture {
  authorizationRequests: number;
  gestureResponsesReleased: boolean;
  referenceRequests: number;
  pushes: { authorization?: string; body: unknown }[];
}

interface FixtureWindow extends Window {
  pupitreProductionFixture?: ProductionPupitreFixture;
}

interface TargetInfoFixture {
  targetId: string;
  type: string;
  url: string;
}

interface TargetListFixture {
  targetInfos: TargetInfoFixture[];
}

interface AttachedTargetFixture {
  sessionId: string;
}

interface NetworkProbeFixture {
  failureName?: string;
  reached: boolean;
}

const networkProbeFixtureFrom = (data: NetworkProbeFixture): NetworkProbeFixture => {
  const result: NetworkProbeFixture = { reached: data.reached };
  if (data.failureName !== undefined) {
    result.failureName = data.failureName;
  }
  return result;
};

describe('Production pupitre offline restart', () => {
  beforeEach(() => {
    givenACleanBrowserWithHttpCacheDisabled();
    givenTheOfflineDriver();
    thenTheOfflineDriverIsReady();
  });

  afterEach(() => {
    whenRestoringTheBrowserNetwork();
  });

  it('should boot offline and publish one durable gesture with its original identity after several restarts', () => {
    whenBootingTheProductionPupitre();

    thenTheProductionPupitreIsOnline();
    thenTheDeviceIsEnrolledOnce();
    thenTheInitialReferenceHasBeenFetched();
    thenTheServiceWorkerIsActivated();
    whenRestartingTheProductionPupitre();
    thenTheProductionPupitreIsOnline();
    thenTheServiceWorkerControlsTheRestartedPupitre();
    thenTheDeviceIsEnrolledOnce();
    thenTheReferenceHasBeenFetchedAfterTheOnlineRestart();
    whenOpeningTheJournalFixture();
    thenTheJournalFixtureIsReady();
    whenPreparingDurableStateThroughTheJournalPort();
    thenAnUncachedBrowserRequestSucceeds();
    whenCuttingTheBrowserNetwork();
    thenAnUncachedBrowserRequestFails();
    thenTheControlledPupitreCannotReachANoncachedUrl();
    whenRestartingTheProductionPupitre();

    thenTheProductionPupitreBootsOffline();
    thenThePendingJournalAndReferenceSurvivedTheOfflineRestart();
    thenNoGestureReachedTheServer();
    whenRestartingTheProductionPupitre();
    thenTheProductionPupitreBootsOffline();
    thenThePendingJournalAndReferenceSurvivedTheOfflineRestart();
    thenNoGestureReachedTheServer();
    whenRestoringTheBrowserNetwork();
    thenAnUncachedBrowserRequestSucceeds();
    thenTheControlledPupitreCanReachTheNetwork();
    whenAnnouncingTheNetworkReturn();

    thenTheOriginalGestureReachedTheServerExactlyOnce();
    whenReleasingTheGestureResponse();
    thenTheReplayHasSettledThroughTheJournalPort();
    thenTheOriginalGestureIsAcceptedInTheJournal();
    thenTheReferenceIsRefreshedAfterReconnect();
    whenRestartingTheProductionPupitre();
    thenTheProductionPupitreIsOnline();
    thenTheReferenceIsRefreshedAfterTheFinalRestart();
    thenTheOriginalGestureStillReachedTheServerExactlyOnce();
    thenTheDeviceIsEnrolledOnce();
    thenTheJournalAndReferenceSurvivedEveryRestart();
  });
});

const givenACleanBrowserWithHttpCacheDisabled = (): void => {
  serviceWorkerSessions = [];
  cy.then(() => {
    const origin = Cypress.config('baseUrl');
    if (origin === null) throw new Error('The production offline origin is missing.');
    return Cypress.automation('remote:debugger:protocol', {
      command: 'Storage.clearDataForOrigin',
      params: { origin, storageTypes: 'all' },
    });
  });
  cy.then(() => Cypress.automation('remote:debugger:protocol', { command: 'Network.setCacheDisabled', params: { cacheDisabled: true } }));
  cy.then(() => Cypress.automation('remote:debugger:protocol', { command: 'Network.clearBrowserCache' }));
};

const givenTheOfflineDriver = (): void => {
  cy.visit('/__harness');
};

const thenTheOfflineDriverIsReady = (): void => {
  cy.get(dataSelector('offline-driver')).should('exist');
};

const whenBootingTheProductionPupitre = (): void => appendFrame('production-pupitre', '/');

const whenRestartingTheProductionPupitre = (): void => {
  cy.get(dataSelector('production-pupitre')).then(frame => frame.remove());
  appendFrame('production-pupitre', `/?restart=${Date.now()}`);
};

const whenOpeningTheJournalFixture = (): void => appendFrame('journal-fixture', '/__fixture');

const whenPreparingDurableStateThroughTheJournalPort = (): void => {
  thenProductionFixture().then(fixture => fixture.prepare(entrepriseFixture, referenceFixture, gestureFixture));
};

const whenCuttingTheBrowserNetwork = (): void => {
  setBrowserOffline(true);
};

const whenRestoringTheBrowserNetwork = (): void => {
  setBrowserOffline(false);
};

const whenAnnouncingTheNetworkReturn = (): void => {
  thenPupitreWindow().then(window => {
    window.dispatchEvent(new Event('online'));
  });
};

const whenReleasingTheGestureResponse = (): void => {
  cy.request('POST', '/__control/release-gesture-responses');
};

const thenTheProductionPupitreIsOnline = (): void => {
  thenPupitreContains('pupitre-shell');
  thenPupitreContains('pupitre-connected');
};

const thenTheProductionPupitreBootsOffline = (): void => {
  thenPupitreContains('pupitre-shell');
  thenPupitreContains('pupitre-disconnected');
};

const thenTheServiceWorkerIsActivated = (): void => {
  thenPupitreWindow().then(window =>
    cy.wrap(window.navigator.serviceWorker.ready, { timeout: 40_000 }).its('active.state').should('equal', 'activated'),
  );
};

const thenTheServiceWorkerControlsTheRestartedPupitre = (): void => {
  thenPupitreWindow().should(window => {
    expect(window.navigator.serviceWorker.controller?.scriptURL).to.match(/\/ngsw-worker\.js$/);
  });
};

const thenTheDeviceIsEnrolledOnce = (): void => {
  thenServerState('authorizationRequests', 1).its('authorizationRequests').should('equal', 1);
};

const thenTheInitialReferenceHasBeenFetched = (): void => {
  thenServerState('referenceRequests', 2).its('referenceRequests').should('be.at.least', 2);
};

const thenTheReferenceHasBeenFetchedAfterTheOnlineRestart = (): void => {
  thenServerState('referenceRequests', 4).its('referenceRequests').should('be.at.least', 4);
};

const thenTheReferenceIsRefreshedAfterReconnect = (): void => {
  thenServerState('referenceRequests', 6).its('referenceRequests').should('be.at.least', 6);
};

const thenTheReferenceIsRefreshedAfterTheFinalRestart = (): void => {
  thenServerState('referenceRequests', 8).its('referenceRequests').should('be.at.least', 8);
};

const thenTheJournalFixtureIsReady = (): void => {
  thenProductionFixture().should('exist');
};

const thenAnUncachedBrowserRequestFails = (): void => {
  browserNetworkProbe().then(result => {
    expect(result).to.deep.equal({ failureName: 'TypeError', reached: false });
  });
};

const thenAnUncachedBrowserRequestSucceeds = (): void => {
  browserNetworkProbe().its('reached').should('equal', true);
};

const thenTheControlledPupitreCannotReachANoncachedUrl = (): void => {
  thenPupitreWindow()
    .then(window => window.fetch(`/__network-probe?offline=${Date.now()}`, { cache: 'no-store' }))
    .its('ok')
    .should('equal', false);
};

const thenTheControlledPupitreCanReachTheNetwork = (): void => {
  thenPupitreWindow()
    .then(window => window.fetch(`/__network-probe?restored=${Date.now()}`, { cache: 'no-store' }))
    .its('ok')
    .should('equal', true);
};

const thenNoGestureReachedTheServer = (): void => {
  thenServerState().its('pushes').should('have.length', 0);
};

const thenThePendingJournalAndReferenceSurvivedTheOfflineRestart = (): void => {
  thenProductionFixture()
    .then(fixture => fixture.read(entrepriseFixture))
    .then(state => {
      expect(state.referentiel).to.deep.equal(referenceFixture);
      expect(state.evenements).to.deep.equal([{ geste: gestureFixture, etat: 'EN_ATTENTE' }]);
    });
};

const thenTheOriginalGestureReachedTheServerExactlyOnce = (): void => {
  thenServerState('pushes', 1).should(state => {
    expect(state.gestureResponsesReleased).to.equal(false);
    expect(state.pushes).to.deep.equal([
      {
        authorization: `Bearer ${tokenFixture}`,
        body: { id: idFixture, dateDeSurvenue: dateFixture, operateur: 'operator-1' },
      },
    ]);
  });
};

const thenTheReplayHasSettledThroughTheJournalPort = (): void => {
  thenProductionFixture().then(fixture => fixture.waitForSynchronization());
};

const thenTheOriginalGestureIsAcceptedInTheJournal = (): void => {
  thenProductionFixture()
    .then(fixture => fixture.read(entrepriseFixture))
    .its('evenements')
    .should('deep.equal', [acceptedGestureFixture]);
};

const thenTheOriginalGestureStillReachedTheServerExactlyOnce = (): void => {
  thenServerState().its('pushes').should('have.length', 1);
};

const thenTheJournalAndReferenceSurvivedEveryRestart = (): void => {
  thenProductionFixture()
    .then(fixture => fixture.read(entrepriseFixture))
    .then(state => {
      expect(state.referentiel).to.deep.equal(referenceFixture);
      expect(state.evenements).to.deep.equal([acceptedGestureFixture]);
    });
};

const appendFrame = (selector: string, source: string): void => {
  cy.document().then(document => {
    const frame = document.createElement('iframe');
    frame.dataset['selector'] = selector;
    frame.src = source;
    document.body.append(frame);
  });
};

const pupitreFrame = (): Cypress.Chainable<JQuery<HTMLIFrameElement>> => cy.get(dataSelector('production-pupitre'));

const fixtureFrame = (): Cypress.Chainable<JQuery<HTMLIFrameElement>> => cy.get(dataSelector('journal-fixture'));

const thenPupitreWindow = (): Cypress.Chainable<Window> =>
  pupitreFrame().then(frame => {
    const window = requiredFixture(frame[0], 'production pupitre frame').contentWindow;
    if (window === null) throw new Error('The production pupitre browsing context is unavailable.');
    return window;
  });

const thenFixtureWindow = (): Cypress.Chainable<FixtureWindow> =>
  fixtureFrame().then(frame => {
    const window = requiredFixture(frame[0], 'journal fixture frame').contentWindow;
    if (window === null) throw new Error('The journal fixture browsing context is unavailable.');
    return window as FixtureWindow;
  });

const thenProductionFixture = (): Cypress.Chainable<ProductionPupitreFixture> =>
  thenFixtureWindow().its('pupitreProductionFixture').should('exist');

const thenPupitreContains = (selector: string): void => {
  pupitreFrame().should(frame => {
    const pupitre = requiredFixture(frame[0], 'production pupitre frame');
    expect(pupitre.contentDocument?.querySelector(dataSelector(selector)) ?? null).not.to.equal(null);
  });
};

const thenServerState = (until?: string, atLeast?: number): Cypress.Chainable<ServerStateFixture> => {
  const query = until === undefined ? '' : `?until=${encodeURIComponent(until)}&atLeast=${String(atLeast ?? 0)}`;
  return cy.request<ServerStateFixture>({ url: `/__control${query}`, timeout: 40_000 }).its('body');
};

const browserNetworkProbe = (): Cypress.Chainable<NetworkProbeFixture> =>
  cy.document().then(
    document =>
      new Cypress.Promise<NetworkProbeFixture>(resolve => {
        const frame = document.createElement('iframe');
        const token = crypto.randomUUID();
        const listener = (event: MessageEvent<NetworkProbeFixture & { token?: string }>): void => {
          if (event.source !== frame.contentWindow || event.data.token !== token) return;
          document.defaultView?.removeEventListener('message', listener);
          frame.remove();
          resolve(networkProbeFixtureFrom(event.data));
        };
        document.defaultView?.addEventListener('message', listener);
        frame.sandbox.add('allow-scripts');
        frame.srcdoc = `<script>fetch('http://localhost:9080/__network-probe?proof=${token}', {cache:'no-store'}).then(() => parent.postMessage({token:'${token}',reached:true}, '*'), failure => parent.postMessage({token:'${token}',reached:false,failureName:failure.name}, '*'))</script>`;
        document.body.append(frame);
      }),
  );

const setBrowserOffline = (offline: boolean): void => {
  const conditions = {
    offline,
    latency: 0,
    downloadThroughput: offline ? 0 : -1,
    uploadThroughput: offline ? 0 : -1,
    connectionType: offline ? 'none' : 'wifi',
  };
  if (offline) {
    setPageNetworkConditions(conditions);
    cy.then(() => attachAndDisconnectServiceWorkers(conditions));
    return;
  }
  cy.then(() => setServiceWorkerNetworkConditions(conditions));
  setPageNetworkConditions(conditions);
};

const setPageNetworkConditions = (conditions: object): void => {
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Network.emulateNetworkConditions',
      params: conditions,
    }),
  );
};

const attachAndDisconnectServiceWorkers = (conditions: object): Promise<unknown[]> =>
  Promise.resolve(Cypress.automation('remote:debugger:protocol', { command: 'Target.getTargets' }) as PromiseLike<unknown>).then(answer => {
    const targets = (answer as TargetListFixture).targetInfos.filter(
      target => target.type === 'service_worker' && target.url.endsWith('/ngsw-worker.js'),
    );
    if (targets.length === 0) throw new Error('No active production service-worker target was available for the network cut.');
    return Promise.all(
      targets.map(target =>
        Promise.resolve(
          Cypress.automation('remote:debugger:protocol', {
            command: 'Target.attachToTarget',
            params: { targetId: target.targetId, flatten: false },
          }) as PromiseLike<unknown>,
        ).then(attached => {
          const sessionId = (attached as AttachedTargetFixture).sessionId;
          serviceWorkerSessions.push(sessionId);
          return sendNetworkConditionsTo(sessionId, conditions);
        }),
      ),
    );
  });

const setServiceWorkerNetworkConditions = (conditions: object): Promise<unknown[]> =>
  Promise.all(serviceWorkerSessions.map(sessionId => sendNetworkConditionsTo(sessionId, conditions)));

const sendNetworkConditionsTo = (sessionId: string, conditions: object): Promise<unknown> =>
  Promise.resolve(
    Cypress.automation('remote:debugger:protocol', {
      command: 'Target.sendMessageToTarget',
      params: {
        sessionId,
        message: JSON.stringify({ id: 1, method: 'Network.emulateNetworkConditions', params: conditions }),
      },
    }) as PromiseLike<unknown>,
  );
