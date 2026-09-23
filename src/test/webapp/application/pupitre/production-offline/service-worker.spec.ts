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
  operateurs: [{ id: 'operator-1', nom: 'Dupont', prenom: 'Jean', matricule: '049', etat: 'ABSENT', postes: [], evenements: [] }],
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
const serviceWorkerSessions: string[] = [];

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
    whenReadingOnlinePupitre('initial', 1);
    whenWaitingForServiceWorkerActivation();
    whenRestartingTheProductionPupitre();
    whenReadingOnlinePupitre('online-restart', 2);
    whenOpeningTheJournalFixture();
    whenPreparingDurableStateThroughTheJournalPort();
    whenProbingBrowserNetwork('initial-network');
    whenCuttingTheBrowserNetwork();
    whenProbingBrowserNetwork('offline-network');
    whenProbingControlledPupitre('offline-controlled-network');
    whenRestartingTheProductionPupitre();
    whenReadingOfflinePupitre('first-offline-restart');
    whenRestartingTheProductionPupitre();
    whenReadingOfflinePupitre('second-offline-restart');
    whenRestoringTheBrowserNetwork();
    whenProbingBrowserNetwork('restored-network');
    whenProbingControlledPupitre('restored-controlled-network');
    whenAnnouncingTheNetworkReturn();
    whenReadingPendingReplay();
    whenReleasingTheGestureResponse();
    whenReadingAcceptedReplay();
    whenRestartingTheProductionPupitre();
    whenReadingOnlinePupitre('final-restart', 4);
    whenReadingJournal('final-journal');

    thenOnlinePupitreWasObserved('initial', 1);
    thenTheWorkerActivatedAndControlledTheOnlineRestart();
    thenOnlinePupitreWasObserved('online-restart', 2);
    thenTheBrowserNetworkWasCutAndRestored();
    thenOfflineRestartPreservedPendingWork('first-offline-restart');
    thenOfflineRestartPreservedPendingWork('second-offline-restart');
    thenTheOriginalGestureWasReplayedAndAccepted();
    thenOnlinePupitreWasObserved('final-restart', 4);
    thenTheAcceptedGestureSurvivedTheFinalRestart();
  });
});

const givenACleanBrowserWithHttpCacheDisabled = (): void => {
  cy.then(() => detachServiceWorkers());
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
  readProductionFixture().then(fixture => fixture.prepare(entrepriseFixture, referenceFixture, gestureFixture));
};

const whenCuttingTheBrowserNetwork = (): void => {
  setBrowserOffline(true);
};

const whenRestoringTheBrowserNetwork = (): void => {
  setBrowserOffline(false);
};

const whenAnnouncingTheNetworkReturn = (): void => {
  readPupitreWindow().then(window => {
    window.dispatchEvent(new Event('online'));
  });
};

const whenReleasingTheGestureResponse = (): void => {
  cy.request('POST', '/__control/release-gesture-responses');
};

const whenReadingOnlinePupitre = (alias: string, referenceRequests: number): void => {
  waitForPupitre('pupitre-connected');
  readPupitreWindow()
    .then(window => ({
      shell: window.document.querySelector(dataSelector('pupitre-shell')) !== null,
      connected: window.document.querySelector(dataSelector('pupitre-connected')) !== null,
      controller: window.navigator.serviceWorker.controller?.scriptURL,
    }))
    .as(`${alias}-view`, { type: 'static' });
  readServerState('referenceRequests', referenceRequests).as(`${alias}-server`, { type: 'static' });
};

const whenWaitingForServiceWorkerActivation = (): void => {
  readPupitreWindow()
    .then(window => cy.wrap(window.navigator.serviceWorker.ready, { timeout: 40_000 }).its('active.state').should('equal', 'activated'))
    .as('worker-state', { type: 'static' });
};

const whenReadingOfflinePupitre = (alias: string): void => {
  waitForPupitre('pupitre-disconnected');
  readPupitreWindow()
    .then(window => ({
      shell: window.document.querySelector(dataSelector('pupitre-shell')) !== null,
      disconnected: window.document.querySelector(dataSelector('pupitre-disconnected')) !== null,
    }))
    .as(`${alias}-view`, { type: 'static' });
  whenReadingJournal(`${alias}-journal`);
  readServerState().as(`${alias}-server`, { type: 'static' });
};

const whenReadingJournal = (alias: string): void => {
  readProductionFixture()
    .then(fixture => fixture.read(entrepriseFixture))
    .as(alias, { type: 'static' });
};

const whenProbingBrowserNetwork = (alias: string): void => {
  browserNetworkProbe().as(alias, { type: 'static' });
};

const whenProbingControlledPupitre = (alias: string): void => {
  readPupitreWindow()
    .then(window => window.fetch(`/__network-probe?probe=${Date.now()}`, { cache: 'no-store' }))
    .its('ok')
    .as(alias, { type: 'static' });
};

const whenReadingPendingReplay = (): void => {
  readServerState('pushes', 1).as('pending-replay', { type: 'static' });
};

const whenReadingAcceptedReplay = (): void => {
  readProductionFixture().then(fixture => fixture.waitForSynchronization());
  whenReadingJournal('accepted-journal');
  readServerState('referenceRequests', 3).as('accepted-server', { type: 'static' });
};

const thenOnlinePupitreWasObserved = (alias: string, referenceRequests: number): void => {
  cy.get(`@${alias}-view`).should('include', { shell: true, connected: true });
  cy.get<ServerStateFixture>(`@${alias}-server`).should(state => {
    expect(state.authorizationRequests).to.equal(1);
    expect(state.referenceRequests).to.be.at.least(referenceRequests);
  });
};

const thenTheWorkerActivatedAndControlledTheOnlineRestart = (): void => {
  cy.get('@worker-state').should('equal', 'activated');
  cy.get('@online-restart-view')
    .its('controller')
    .should('match', /\/ngsw-worker\.js$/);
};

const thenTheBrowserNetworkWasCutAndRestored = (): void => {
  cy.get('@initial-network').should('deep.equal', { reached: true });
  cy.get('@offline-network').should('deep.equal', { failureName: 'TypeError', reached: false });
  cy.get('@offline-controlled-network').should('equal', false);
  cy.get('@restored-network').should('deep.equal', { reached: true });
  cy.get('@restored-controlled-network').should('equal', true);
};

const thenOfflineRestartPreservedPendingWork = (alias: string): void => {
  cy.get(`@${alias}-view`).should('deep.equal', { shell: true, disconnected: true });
  cy.get(`@${alias}-journal`).its('referentiel').should('deep.equal', referenceFixture);
  cy.get(`@${alias}-journal`)
    .its('evenements')
    .should('deep.equal', [{ geste: gestureFixture, etat: 'EN_ATTENTE' }]);
  cy.get(`@${alias}-server`).its('pushes').should('have.length', 0);
};

const thenTheOriginalGestureWasReplayedAndAccepted = (): void => {
  cy.get<ServerStateFixture>('@pending-replay').should(state => {
    expect(state.gestureResponsesReleased).to.equal(false);
    expect(state.pushes).to.deep.equal([
      {
        authorization: `Bearer ${tokenFixture}`,
        body: { id: idFixture, dateDeSurvenue: dateFixture, operateur: 'operator-1' },
      },
    ]);
  });
  cy.get('@accepted-journal').its('evenements').should('deep.equal', [acceptedGestureFixture]);
  cy.get('@accepted-server').its('referenceRequests').should('be.at.least', 3);
};

const thenTheAcceptedGestureSurvivedTheFinalRestart = (): void => {
  cy.get('@final-journal').its('evenements').should('deep.equal', [acceptedGestureFixture]);
  cy.get('@final-restart-server').its('pushes').should('have.length', 1);
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

const readPupitreWindow = (): Cypress.Chainable<Window> =>
  pupitreFrame().then(frame => {
    const window = requiredFixture(frame[0], 'production pupitre frame').contentWindow;
    if (window === null) throw new Error('The production pupitre browsing context is unavailable.');
    return window;
  });

const readFixtureWindow = (): Cypress.Chainable<FixtureWindow> =>
  fixtureFrame().then(frame => {
    const window = requiredFixture(frame[0], 'journal fixture frame').contentWindow;
    if (window === null) throw new Error('The journal fixture browsing context is unavailable.');
    return window as FixtureWindow;
  });

const readProductionFixture = (): Cypress.Chainable<ProductionPupitreFixture> =>
  readFixtureWindow().its('pupitreProductionFixture').should('exist');

const waitForPupitre = (selector: string): void => {
  pupitreFrame().should(frame => {
    const pupitre = requiredFixture(frame[0], 'production pupitre frame');
    expect(pupitre.contentDocument?.querySelector(dataSelector(selector)) ?? null).not.to.equal(null);
  });
};

const readServerState = (until?: string, atLeast?: number): Cypress.Chainable<ServerStateFixture> => {
  const query = until === undefined ? '' : `?until=${encodeURIComponent(until)}&atLeast=${String(atLeast ?? 0)}`;
  return cy.request<ServerStateFixture>({ url: `/__control${query}`, timeout: 40_000 }).its('body');
};

const browserNetworkProbe = (): Cypress.Chainable<NetworkProbeFixture> =>
  cy.document().then(
    document =>
      new Cypress.Promise<NetworkProbeFixture>(resolve => {
        const frame = document.createElement('iframe');
        const token = crypto.randomUUID();
        const isUnrelatedProbeResponse = (event: MessageEvent<NetworkProbeFixture & { token?: string }>): boolean =>
          event.source !== frame.contentWindow || event.data.token !== token;
        const listener = (event: MessageEvent<NetworkProbeFixture & { token?: string }>): void => {
          if (isUnrelatedProbeResponse(event)) return;
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
  cy.then(() => detachServiceWorkers());
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

const detachServiceWorkers = (): Promise<unknown[]> =>
  Promise.all(
    serviceWorkerSessions.splice(0).map(sessionId =>
      Promise.resolve(
        Cypress.automation('remote:debugger:protocol', {
          command: 'Target.detachFromTarget',
          params: { sessionId },
        }) as PromiseLike<unknown>,
      ).catch(() => undefined),
    ),
  );

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
