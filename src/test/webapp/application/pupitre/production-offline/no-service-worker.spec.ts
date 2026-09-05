import { dataSelector } from '../../../utils/DataSelector';

interface NetworkProbeFixture {
  failureName?: string;
  reached: boolean;
}

describe('Production pupitre without its service worker', () => {
  beforeEach(() => {
    givenACleanBrowserWithHttpCacheDisabled();
    givenTheOfflineDriver();
    thenTheOfflineDriverIsReady();
  });

  afterEach(() => {
    whenRestoringTheBrowserNetwork();
  });

  it('should fail to load its shell after an offline restart', () => {
    whenBootingTheProductionPupitre();

    thenTheProductionPupitreBootsOnline();
    thenNoServiceWorkerControlsIt();
    thenAnUncachedBrowserRequestSucceeds();
    whenCuttingTheBrowserNetwork();
    thenAnUncachedBrowserRequestFails();
    whenRestartingTheProductionPupitreWithoutAServiceWorker();

    thenTheOfflineNavigationHasNoPupitreShell();
  });
});

const givenACleanBrowserWithHttpCacheDisabled = (): void => {
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

const whenBootingTheProductionPupitre = (): void => appendPupitreFrame('/');

const whenCuttingTheBrowserNetwork = (): void => setBrowserOffline(true);

const whenRestoringTheBrowserNetwork = (): void => setBrowserOffline(false);

const whenRestartingTheProductionPupitreWithoutAServiceWorker = (): void => {
  cy.get(dataSelector('production-pupitre')).then(frame => frame.remove());
  cy.document().then(
    document =>
      new Cypress.Promise<void>(resolve => {
        const frame = document.createElement('iframe');
        frame.dataset['selector'] = 'production-pupitre';
        frame.addEventListener('load', () => resolve(), { once: true });
        frame.addEventListener('error', () => resolve(), { once: true });
        frame.src = `/?restart=${Date.now()}`;
        document.body.append(frame);
      }),
  );
};

const thenTheProductionPupitreBootsOnline = (): void => {
  pupitreFrame().should(frame => {
    expect(frame[0].contentDocument?.querySelector(dataSelector('pupitre-shell')) ?? null).not.to.equal(null);
  });
};

const thenNoServiceWorkerControlsIt = (): void => {
  thenPupitreWindow().then(window => {
    expect(window.navigator.serviceWorker.controller).to.equal(null);
    return window.navigator.serviceWorker.getRegistrations().then(registrations => expect(registrations).to.have.length(0));
  });
};

const thenAnUncachedBrowserRequestFails = (): void => {
  browserNetworkProbe().then(result => {
    expect(result).to.deep.equal({ failureName: 'TypeError', reached: false });
  });
};

const thenAnUncachedBrowserRequestSucceeds = (): void => {
  browserNetworkProbe().its('reached').should('equal', true);
};

const thenTheOfflineNavigationHasNoPupitreShell = (): void => {
  cy.get(dataSelector('production-pupitre')).should(frame => {
    const pupitre = frame[0] as HTMLIFrameElement;
    expect(pupitre.contentDocument?.querySelector(dataSelector('pupitre-shell')) ?? null).to.equal(null);
  });
};

const appendPupitreFrame = (source: string): void => {
  cy.document().then(document => {
    const frame = document.createElement('iframe');
    frame.dataset['selector'] = 'production-pupitre';
    frame.src = source;
    document.body.append(frame);
  });
};

const pupitreFrame = (): Cypress.Chainable<JQuery<HTMLIFrameElement>> => cy.get(dataSelector('production-pupitre'));

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
          resolve({ failureName: event.data.failureName, reached: event.data.reached });
        };
        document.defaultView?.addEventListener('message', listener);
        frame.sandbox.add('allow-scripts');
        frame.srcdoc = `<script>fetch('http://localhost:9080/__network-probe?proof=${token}', {cache:'no-store'}).then(() => parent.postMessage({token:'${token}',reached:true}, '*'), failure => parent.postMessage({token:'${token}',reached:false,failureName:failure.name}, '*'))</script>`;
        document.body.append(frame);
      }),
  );

const thenPupitreWindow = (): Cypress.Chainable<Window> =>
  pupitreFrame().then(frame => {
    const window = frame[0].contentWindow;
    if (window === null) throw new Error('The production pupitre browsing context is unavailable.');
    return window;
  });

const setBrowserOffline = (offline: boolean): void => {
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Network.emulateNetworkConditions',
      params: {
        offline,
        latency: 0,
        downloadThroughput: offline ? 0 : -1,
        uploadThroughput: offline ? 0 : -1,
        connectionType: offline ? 'none' : 'wifi',
      },
    }),
  );
};
