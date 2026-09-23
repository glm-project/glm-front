import { ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import type { CyHttpMessages } from 'cypress/types/net-stubbing';
import { dataSelector } from '../../../utils/DataSelector';
import { interceptForever } from '../../../utils/Interceptor';
import { clearPupitreStorageFixture, givenEnrolledPupitreFixture, pupitreTokenFixture } from '../../../utils/PupitreStorageFixture';

const entrepriseFixture = 'entreprise-a';
const operateurFixture = {
  id: 'jean',
  nom: 'Dupont',
  prenom: 'Jean',
  matricule: '049',
  etat: 'ABSENT',
  postes: [],
  evenements: [],
} as const;
const elementFixture = {
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
const activiteFixture = { operateurId: 'jean', categorie: 'TRAVAIL', depuis: '2026-09-05T08:00:00Z' } as const;
const referentielActifFixture: ReferentielDuPupitre = {
  operateurs: [operateurFixture],
  suivis: [
    { ...elementFixture, id: 'piece-active-1', nom: '301', etat: 'EN_COURS', activites: [activiteFixture] },
    { ...elementFixture, id: 'piece-active-2', nom: '302', etat: 'EN_COURS', activites: [activiteFixture] },
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

  beforeEach(() => {
    requetes = [];
    pendingResponse = undefined;
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

  it('should send one global pause after the first pointage', () => {
    givenAnEnrolledPupitre(referentielFixture);

    whenDesignatingOperator049();
    whenStartingElement('piece-1');
    whenPausingAllWork();

    thenPauseWasSentOnceWithoutPointagePerElement();
    thenNoNewDeviceAuthorizationWasRequested();
  });

  it('should stop every personal activity before leaving the operator day', () => {
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
            ...(activite.posteId === undefined ? {} : { poste: activite.posteId }),
          })),
        })),
      },
    }).as('workshop');
    observeWorkshopWrites();
  };

  const observeWorkshopWrites = (): void => {
    cy.intercept('POST', '/api/atelier/journees', request => {
      observeRequest(request, 'ARRIVEE');
      request.reply({ statusCode: 200, body: {} });
    });
    cy.intercept('POST', '/api/atelier/journees/pointages', request => {
      observeRequest(request, String((request.body as { type?: unknown }).type));
      request.reply({ statusCode: 200, body: {} });
    }).as('presence');
    cy.intercept('POST', '/api/atelier/suivis/*/pointages', request => {
      observeRequest(request, String((request.body as { type?: unknown }).type));
      request.reply({ statusCode: 200, body: {} });
    }).as('pointage');
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
    cy.get(dataSelector(`tile-${elementId}`))
      .find(dataSelector('primary-target'))
      .click();
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
    cy.get(dataSelector(`tile-${elementId}`))
      .find(dataSelector('primary-target'))
      .click();
  };

  const whenServerAnswers = (response: ReturnType<typeof interceptForever>): void => {
    cy.then(() => response.send());
  };

  const whenPausingAllWork = (): void => {
    cy.get(dataSelector('pause')).click();
    cy.wait('@presence');
  };

  const whenStoppingAllWork = (): void => {
    cy.get(dataSelector('stop-all')).click();
    cy.wait('@presence');
  };

  const whenOpeningWorkstationChoice = (elementId: string): void => {
    cy.get(dataSelector(`tile-${elementId}`))
      .find(dataSelector('primary-target'))
      .click();
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
      expect(requests.map(({ type }) => type)).to.deep.equal(['ARRIVEE', 'REPRISE', 'DEBUT']);
      expect(requests.every(({ authorization }) => authorization === `Bearer ${pupitreTokenFixture(entrepriseFixture)}`)).to.equal(true);
    });
  };

  const thenPauseWasSentOnceWithoutPointagePerElement = (): void => {
    cy.wrap(requetes).should(requests => {
      expect(requests.map(({ type }) => type)).to.deep.equal(['ARRIVEE', 'REPRISE', 'DEBUT', 'PAUSE']);
    });
  };

  const thenNoNewDeviceAuthorizationWasRequested = (): void => {
    cy.get('@deviceAuthorization.all').should('have.length', 1);
  };

  const thenEveryFinishWasSentBeforeDeparture = (): void => {
    cy.wrap(requetes).should(requests => {
      expect(requests.map(({ type }) => type)).to.deep.equal(['ARRIVEE', 'FIN', 'FIN', 'DEPART']);
      expect(requests.map(({ route }) => new URL(route).pathname)).to.deep.equal([
        '/api/atelier/journees',
        '/api/atelier/suivis/piece-active-1/pointages',
        '/api/atelier/suivis/piece-active-2/pointages',
        '/api/atelier/journees/pointages',
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

  const thenTheKeypadIsEmptyAndNoWorkshopRequestWasSent = (): void => {
    cy.get(dataSelector('workstation-dialog')).should('not.exist');
    cy.get(dataSelector('designation')).should('be.visible');
    cy.get(dataSelector('code'))
      .invoke('text')
      .should(code => expect(code.trim()).to.equal(''));
    cy.wrap(requetes).should('have.length', 0);
  };
});
