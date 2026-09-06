import { ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import type { CyHttpMessages } from 'cypress/types/net-stubbing';
import { dataSelector } from '../../../utils/DataSelector';
import { interceptForever } from '../../../utils/Interceptor';
import { clearPupitreStorageFixture, givenEnrolledPupitreFixture, pupitreTokenFixture } from '../../../utils/PupitreStorageFixture';

const entrepriseFixture = 'entreprise-a';
const operateurFixture = { id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [] } as const;
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

  beforeEach(() => {
    requetes = [];
  });

  afterEach(() => clearPupitreStorageFixture());

  it('should restore an enrolled pupitre and send its first pointage then one global pause in business order', () => {
    givenAnEnrolledPupitre(referentielFixture);

    whenDesignatingOperator049();
    whenStartingElement('piece-1');

    thenTheFirstGestureWasSentInBusinessOrder();
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

  it('should remove an optimistic pointage and show its server refusal in the permanent header', () => {
    givenAnEnrolledPupitre(referentielFixture);
    whenDesignatingOperator049();
    const refusal = givenStartingElementWillBeRefused();

    whenStartingElementOptimistically('piece-1');
    thenElementIsOptimisticallyActive('piece-1');
    whenServerAnswers(refusal);

    thenRefusalReconcilesElementAndHeader('piece-1', '204', 'Pointage refusé par le serveur');
  });

  it('should close a workstation popup on finish and expiry without sending a workshop request', () => {
    givenAControlledClock();
    givenAnEnrolledPupitre(referentielMultiPosteFixture, true);
    whenDesignatingOperator049(true);
    whenOpeningWorkstationChoice('piece-1');

    whenFinishingDesignation();

    thenTheKeypadIsEmptyAndNoWorkshopRequestWasSent();
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
    cy.wait(['@operators', '@workshop']);
    if (withClock) cy.tick(0);
    cy.get(dataSelector('designation')).should('be.visible');
  };

  const givenAControlledClock = (): void => {
    cy.clock(Date.UTC(2026, 8, 6, 12));
  };

  const givenAuthorizationAndWorkshopEdges = (referentiel: ReferentielDuPupitre): void => {
    cy.intercept('POST', '**/protocol/openid-connect/auth/device', { statusCode: 503, body: {} }).as('deviceAuthorization');
    cy.intercept('POST', '**/protocol/openid-connect/token', { statusCode: 503, body: {} });
    cy.intercept('GET', '/api/operateurs*', {
      body: {
        content: referentiel.operateurs.map(operateur => ({ ...operateur, natures: [] })),
        currentPage: 0,
        pageSize: 100,
        totalElementsCount: referentiel.operateurs.length,
      },
    }).as('operators');
    cy.intercept('GET', '/api/atelier/suivis*', {
      body: {
        content: referentiel.suivis.map(suivi => ({
          activitesEnCours: suivi.activites.map(activite => ({
            operateur: { id: activite.operateurId, nom: operateurFixture.nom, prenom: operateurFixture.prenom },
            categorie: activite.categorie,
            depuis: activite.depuis,
          })),
          element: suivi.id,
          engageLe: '2026-09-05T07:30:00Z',
          engagePar: 'gestionnaire',
          etat: suivi.etat,
          id: suivi.id,
          nom: suivi.nom,
          type: suivi.type,
        })),
        currentPage: 0,
        pageSize: 100,
        totalElementsCount: referentiel.suivis.length,
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

  const givenStartingElementWillBeRefused = (): ReturnType<typeof interceptForever> =>
    interceptForever(
      { method: 'POST', url: '/api/atelier/suivis/piece-1/pointages' },
      {
        statusCode: 409,
        body: { type: 'urn:glm:erreur:atelier:transition-d-atelier-interdite', message: 'Pointage refusé par le serveur' },
      },
      'refusedPointage',
    );

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
