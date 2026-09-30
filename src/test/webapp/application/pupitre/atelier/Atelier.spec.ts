import { ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import type { CyHttpMessages } from 'cypress/types/net-stubbing';
import { dataSelector } from '../../../utils/DataSelector';
import { interceptForever } from '../../../utils/Interceptor';
import { controlledTimeFixture, longPressFixture } from '../../../utils/LongPressFixture';
import { clearPupitreStorageFixture, givenEnrolledPupitreFixture, pupitreTokenFixture } from '../../../utils/PupitreStorageFixture';

const entrepriseFixture = 'entreprise-a';
const operateurFixture = {
  id: 'jean',
  nom: 'Dupont',
  prenom: 'Jean',
  matricule: '049',
  postes: [],
} as const;
const elementFixture = {
  conflits: [],
  id: 'piece-1',
  nom: '204',
  etat: 'EN_ATTENTE',
  type: 'ORDRE_DE_FABRICATION',
  activites: [],
  evenements: [],
} as const;
const autreElementFixture = { ...elementFixture, id: 'piece-2', nom: '205' } as const;
const troisiemeElementFixture = { ...elementFixture, id: 'piece-3', nom: '206' } as const;
const referentielFixture: ReferentielDuPupitre = {
  operateurs: [operateurFixture],
  suivis: [elementFixture, autreElementFixture, troisiemeElementFixture],
};
const activiteFixture = {
  ouverture: 'activite-fixture-7',
  echeance: '2026-09-05T21:00:00.000Z',
  operateurId: 'jean',
  categorie: 'TRAVAIL',
  depuis: '2026-09-05T08:00:00Z',
} as const;
const referentielActifFixture: ReferentielDuPupitre = {
  operateurs: [operateurFixture],
  suivis: [
    { ...elementFixture, id: 'piece-active-1', nom: '301', etat: 'EN_COURS', activites: [activiteFixture], conflits: [] },
    { ...elementFixture, id: 'piece-active-2', nom: '302', etat: 'EN_COURS', activites: [activiteFixture], conflits: [] },
  ],
};
const operateurMultiPosteFixture = {
  ...operateurFixture,
  postes: [
    { id: 'tour', libelle: 'Tour' },
    { id: 'fraiseuse', libelle: 'Fraiseuse' },
  ],
} as const;
const referentielMultiPosteFixture: ReferentielDuPupitre = {
  operateurs: [operateurMultiPosteFixture],
  suivis: [elementFixture],
};

interface RequeteMetier {
  readonly route: string;
  readonly type: string;
  readonly authorization: string | undefined;
}

describe('Pupitre workshop journey', () => {
  let requetes: RequeteMetier[];
  let pendingResponse: ReturnType<typeof interceptForever> | undefined;
  let online: boolean;

  beforeEach(() => {
    cy.clock(Date.UTC(2026, 8, 5, 12), ['Date']);
    requetes = [];
    pendingResponse = undefined;
    online = true;
  });

  afterEach(() => {
    cy.then(() => pendingResponse?.send());
    clearPupitreStorageFixture();
  });

  it('should restore an enrolled pupitre and send its first pointage in business order', () => {
    givenAnEnrolledPupitre(referentielFixture);

    whenDesignatingOperator049();
    whenStartingElement('piece-1');

    thenTheFirstGestureWasSentInBusinessOrder();
    thenNoNewDeviceAuthorizationWasRequested();
  });

  it('should replay a pause and its resumption taken offline as finishes then starts, without any pause or resumption', () => {
    givenAnEnrolledPupitre(referentielActifFixture);
    givenTheNetworkIsDown();
    whenDesignatingOperator049();

    whenPausingAllWork();
    whenResumingAllWork();
    whenTheNetworkReturns();

    thenThePauseAndItsResumptionWereReplayedInOrder();
  });

  it('should stop every personal activity by its targeted finish', () => {
    givenAnEnrolledPupitre(referentielActifFixture);
    whenDesignatingOperator049();

    whenStoppingAllWork();

    thenEveryFinishWasSentBeforeDeparture();
  });

  it('should show a pointage optimistically while the server response is pending', () => {
    givenAnEnrolledPupitre(referentielFixture);
    whenDesignatingOperator049();
    givenStartingElementWillBeRefused();

    whenStartingElementOptimistically('piece-1');

    thenElementIsOptimisticallyActive('piece-1');
  });

  it('should remove an optimistic pointage and show its server refusal in the permanent header', () => {
    givenAnEnrolledPupitre(referentielFixture);
    whenDesignatingOperator049();
    const refusal = givenStartingElementWillBeRefused();

    whenStartingElementOptimistically('piece-1');
    whenServerAnswers(refusal);

    thenRefusalReconcilesElementAndHeader('piece-1', '204', 'Pointage refusé par le serveur');
  });

  it('should show a pause optimistically while the server response is pending', () => {
    givenAnEnrolledPupitre(referentielActifFixture);
    whenDesignatingOperator049();
    givenSuspendingWillBeRefused();

    whenPausingAllWork();

    thenTheOperatorIsOptimisticallyOnPause();
  });

  it('should reopen the suspended activity and show its refusal after an optimistic pause is refused', () => {
    givenAnEnrolledPupitre({ ...referentielActifFixture, suivis: referentielActifFixture.suivis.slice(0, 1) });
    whenDesignatingOperator049();
    const refusal = givenSuspendingWillBeRefused();

    whenPausingAllWork();
    whenServerAnswers(refusal);

    thenThePauseRefusalReconciles('PAUSE', 'Pause refusée par le serveur');
  });

  it('should close workstation choice on finish without sending work', () => {
    givenAControlledClock();
    givenAnEnrolledPupitre(referentielMultiPosteFixture, true);
    whenDesignatingOperator049(true);
    whenOpeningWorkstationChoice('piece-1');
    whenFinishingDesignation();

    thenTheKeypadIsEmptyAndNoWorkshopRequestWasSent();
  });

  it('should close workstation choice on expiry without sending work', () => {
    givenAControlledClock();
    givenAnEnrolledPupitre(referentielMultiPosteFixture, true);
    whenDesignatingOperator049(true);
    whenOpeningWorkstationChoice('piece-1');
    whenFinishingDesignation();
    whenDesignatingOperator049(true);
    whenOpeningWorkstationChoice('piece-1');
    whenDesignationExpires();

    thenTheKeypadIsEmptyAndNoWorkshopRequestWasSent();
  });

  const givenAnEnrolledPupitre = (referentiel: ReferentielDuPupitre, withClock = false): void => {
    givenAuthorizationAndWorkshopEdges(referentiel);
    cy.visit('/');
    cy.wait('@deviceAuthorization');
    givenEnrolledPupitreFixture({ entreprise: entrepriseFixture, referentiel });

    cy.reload();
    cy.wait('@workshop');
    if (withClock) cy.tick(0);
    cy.get(dataSelector('designation')).should('be.visible');
  };

  const givenAControlledClock = (): void => {
    cy.clock().invoke('restore');
    cy.clock(Date.UTC(2026, 8, 6, 12));
  };

  const givenAuthorizationAndWorkshopEdges = (referentiel: ReferentielDuPupitre): void => {
    cy.intercept('POST', '**/protocol/openid-connect/auth/device', { statusCode: 503, body: {} }).as('deviceAuthorization');
    cy.intercept('POST', '**/protocol/openid-connect/token', { statusCode: 503, body: {} });
    cy.intercept('GET', '/api/pupitre/referentiel', {
      body: {
        genereLe: '2026-09-05T08:05:00Z',
        operateurs: referentiel.operateurs,
        suivis: referentiel.suivis.map(suivi => ({
          id: suivi.id,
          nom: suivi.nom,
          etat: suivi.etat,
          type: suivi.type,
          ...(suivi.reference === undefined ? {} : { reference: suivi.reference }),
          activites: suivi.activites.map(activite => ({
            operateur: activite.operateurId,
            categorie: activite.categorie,
            depuis: activite.depuis,
            ouverture: activite.ouverture,
            echeance: activite.echeance,
            ...(activite.posteId === undefined ? {} : { poste: activite.posteId }),
          })),
          conflits: [],
        })),
      },
    }).as('workshop');
    observeWorkshopWrites();
  };

  const observeWorkshopWrites = (): void => {
    cy.intercept('POST', '/api/atelier/suivis/*/pointages', request => {
      replyWhenOnline(request, String((request.body as { type?: unknown }).type));
    }).as('pointage');
  };

  const replyWhenOnline = (request: CyHttpMessages.IncomingHttpRequest, type: string): void => {
    if (!online) {
      request.reply({ forceNetworkError: true });
      return;
    }
    observeRequest(request, type);
    request.reply({
      statusCode: 200,
      body: {
        id: new URL(request.url).pathname.split('/')[4],
        nom: 'OF-1',
        type: 'ORDRE_DE_FABRICATION',
        element: 'element',
        engageLe: '2026-09-05T07:00:00Z',
        engagePar: 'gestionnaire',
        etat: 'EN_ATTENTE',
        activitesEnCours: [],
        conflits: [],
        journal: [],
      },
    });
  };

  const givenTheNetworkIsDown = (): void => {
    cy.then(() => {
      online = false;
    });
  };

  const whenTheNetworkReturns = (): void => {
    cy.then(() => {
      online = true;
    });
    cy.window().then(window => window.dispatchEvent(new Event('online')));
  };

  const observeRequest = (request: CyHttpMessages.IncomingHttpRequest, type: string): void => {
    const authorization = request.headers['authorization'];
    requetes.push({ route: request.url, type, authorization: Array.isArray(authorization) ? authorization[0] : authorization });
  };

  const whenDesignatingOperator049 = (withClock = false): void => {
    for (const digit of ['0', '4', '9']) cy.get(dataSelector(`digit-${digit}`)).click();
    if (withClock) cy.tick(0);
    cy.get(dataSelector('validate')).click();
    if (withClock) cy.tick(0);
    cy.get(dataSelector('pointage')).should('be.visible');
  };

  const whenStartingElement = (elementId: string): void => {
    longPressFixture(cy.get(dataSelector(`tile-${elementId}`)).find(dataSelector('primary-target')));
    cy.wait('@pointage');
  };

  const givenStartingElementWillBeRefused = (): ReturnType<typeof interceptForever> => {
    pendingResponse = interceptForever(
      { method: 'POST', url: '/api/atelier/suivis/piece-1/pointages' },
      {
        statusCode: 409,
        body: { type: 'urn:glm:erreur:atelier:transition-d-atelier-interdite', message: 'Pointage refusé par le serveur' },
      },
      'refusedPointage',
    );
    return pendingResponse;
  };

  const whenStartingElementOptimistically = (elementId: string): void => {
    longPressFixture(cy.get(dataSelector(`tile-${elementId}`)).find(dataSelector('primary-target')));
  };

  const whenServerAnswers = (response: ReturnType<typeof interceptForever>): void => {
    cy.then(() => response.send());
  };

  const whenPausingAllWork = (): void => {
    longPressFixture(cy.get(dataSelector('pause')).should('not.be.disabled'));
  };

  const whenResumingAllWork = (): void => {
    longPressFixture(cy.get(dataSelector('resume')).should('not.be.disabled'));
  };

  const givenSuspendingWillBeRefused = (): ReturnType<typeof interceptForever> => {
    pendingResponse = interceptForever(
      { method: 'POST', url: '/api/atelier/suivis/piece-active-1/pointages' },
      {
        statusCode: 409,
        body: { type: 'urn:glm:erreur:atelier:transition-d-atelier-interdite', message: 'Pause refusée par le serveur' },
      },
      'refusedSuspension',
    );
    return pendingResponse;
  };

  const whenStoppingAllWork = (): void => {
    longPressFixture(cy.get(dataSelector('stop-all')));
    cy.wait('@pointage');
  };

  const whenOpeningWorkstationChoice = (elementId: string): void => {
    longPressFixture(cy.get(dataSelector(`tile-${elementId}`)).find(dataSelector('primary-target')), controlledTimeFixture);
    cy.tick(0);
    cy.get(dataSelector('workstation-dialog')).should('be.visible');
  };

  const whenFinishingDesignation = (): void => {
    cy.get(dataSelector('finish')).click();
    cy.tick(0);
  };

  const whenDesignationExpires = (): void => {
    cy.tick(30_001);
  };

  const thenTheFirstGestureWasSentInBusinessOrder = (): void => {
    cy.wrap(requetes).should(requests => {
      expect(requests.map(({ type }) => type)).to.deep.equal(['DEBUT']);
      expect(requests.every(({ authorization }) => authorization === `Bearer ${pupitreTokenFixture(entrepriseFixture)}`)).to.equal(true);
    });
  };

  const thenThePauseAndItsResumptionWereReplayedInOrder = (): void => {
    cy.wrap(requetes).should(requests => {
      expect(requests.map(({ type }) => type)).to.deep.equal(['FIN', 'FIN', 'DEBUT', 'DEBUT']);
      expect(requests.map(({ route }) => new URL(route).pathname)).to.deep.equal([
        '/api/atelier/suivis/piece-active-1/pointages',
        '/api/atelier/suivis/piece-active-2/pointages',
        '/api/atelier/suivis/piece-active-1/pointages',
        '/api/atelier/suivis/piece-active-2/pointages',
      ]);
    });
  };

  const thenNoNewDeviceAuthorizationWasRequested = (): void => {
    cy.get('@deviceAuthorization.all').should('have.length', 1);
  };

  const thenEveryFinishWasSentBeforeDeparture = (): void => {
    cy.wrap(requetes).should(requests => {
      expect(requests.map(({ type }) => type)).to.deep.equal(['FIN', 'FIN']);
      expect(requests.map(({ route }) => new URL(route).pathname)).to.deep.equal([
        '/api/atelier/suivis/piece-active-1/pointages',
        '/api/atelier/suivis/piece-active-2/pointages',
      ]);
    });
  };

  const thenElementIsOptimisticallyActive = (elementId: string): void => {
    cy.get(dataSelector(`tile-${elementId}`))
      .find(dataSelector('duration'))
      .should('exist');
  };

  const thenRefusalReconcilesElementAndHeader = (elementId: string, context: string, message: string): void => {
    cy.wait('@refusedPointage');
    cy.get(dataSelector(`tile-${elementId}`))
      .find(dataSelector('duration'))
      .should('not.exist');
    cy.get(dataSelector('header-message')).should('contain.text', context).and('contain.text', message);
  };

  const thenTheOperatorIsOptimisticallyOnPause = (): void => {
    cy.get(dataSelector('header-pause')).should('contain.text', 'En pause');
    cy.get(dataSelector('pause')).should('be.disabled');
    cy.get(dataSelector('resume')).should('not.be.disabled');
  };

  const thenThePauseRefusalReconciles = (context: string, message: string): void => {
    cy.wait('@refusedSuspension');
    cy.get(dataSelector('header-pause')).should('not.exist');
    cy.get(dataSelector('pause')).should('not.be.disabled');
    cy.get(dataSelector('resume')).should('be.disabled');
    cy.get(dataSelector('header-message')).should('contain.text', context).and('contain.text', message);
  };

  const thenTheKeypadIsEmptyAndNoWorkshopRequestWasSent = (): void => {
    cy.get(dataSelector('workstation-dialog')).should('not.exist');
    cy.get(dataSelector('designation')).should('be.visible');
    cy.get(dataSelector('code'))
      .invoke('text')
      .should(code => expect(code.trim()).to.equal(''));
    cy.wrap(requetes).should('have.length', 0);
  };
});
