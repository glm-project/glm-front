import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';
import {
  apercuFixture,
  dossierApresCorrectionFixture,
  dossierFinAutomatiqueFixture,
  dossierFinTardiveFixture,
  finCorrigeeFixture,
  finTardiveFixture,
  givenTheReferentielFinAutomatique,
  motifFinAutomatiqueFixture,
  ouvrantFinAutomatiqueFixture,
  suiviFinAutomatiqueFixture,
} from '../../../utils/gestion/anomalies-de-pointage/FinAutomatiqueHttp.fixture';
import { thenTheInstantFieldsShow } from '../../../utils/gestion/anomalies-de-pointage/InstantField';
import { markerOf } from '../../../utils/gestion/anomalies-de-pointage/SelectionDuPointage';

describe('Automatic end dossier in Gestion', () => {
  beforeEach(() => {
    givenTheReferentielFinAutomatique();
    cy.intercept('GET', `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`, {
      body: dossierFinAutomatiqueFixture(),
    });
  });

  [320, 1280].forEach(width => {
    it(`should keep the automatic end and the time to enter reachable at ${width} pixels`, () => {
      whenOpeningTheAutomaticEndAt(width);
      whenChoosingTheEndRegularisation();
      whenReachingTheTimeField();

      thenTheTimeIsReachableWithoutHorizontalOverflow();
    });
  });

  const whenOpeningTheAutomaticEndAt = (width: number): void => {
    cy.viewport(width, 900);
    cy.visit(`/anomalies/${suiviFinAutomatiqueFixture}?pointage=${ouvrantFinAutomatiqueFixture}`);
  };

  const whenChoosingTheEndRegularisation = (): void => {
    cy.get(dataSelector('anomalie-probleme')).should('be.visible');
    cy.get(dataSelector('anomalie-choix')).click();
  };

  const whenReachingTheTimeField = (): void => {
    cy.get(dataSelector('anomalie-instant-heure')).scrollIntoView();
  };

  const thenTheTimeIsReachableWithoutHorizontalOverflow = (): void => {
    cy.get(dataSelector('anomalie-instant-date')).should('be.visible').and('have.value', '');
    cy.get(dataSelector('anomalie-instant-heure')).should('be.visible').and('have.value', '');
    cy.get(dataSelector('anomalie-instant-horloge')).should('be.visible');
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth).to.equal(document.documentElement.clientWidth);
    });
  };
});

describe('Late end handle on the frise in Gestion', () => {
  const suiviUrl = `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`;
  const echelleDebutHeure = 7;
  const echelleDureeHeures = 19;

  beforeEach(() => {
    cy.clock(new Date(2026, 8, 15, 10, 0).getTime(), ['Date']);
    givenTheReferentielFinAutomatique();
    cy.intercept('GET', suiviUrl, { body: dossierFinTardiveFixture() });
  });

  it('should move the proposed end to the time the handle is dragged to', () => {
    whenOpeningTheLateEndCorrection();
    whenDraggingTheHandleTo(22);

    thenTheTimeFieldShows(new Date(2026, 8, 14, 22, 0));
  });

  it('should not drag the handle before the start of the activity the end terminates', () => {
    whenOpeningTheLateEndCorrection();
    whenDraggingTheHandleTo(7.5);

    thenTheTimeFieldShows(new Date(2026, 8, 14, 8, 0));
  });

  it('should withdraw the preview of the correction as soon as the handle moves', () => {
    givenAPreviewOfTheLateEndCorrection();

    whenOpeningTheLateEndCorrection();
    whenPreviewingTheCorrection();
    whenDraggingTheHandleTo(22);

    thenNoPreviewIsShown();
  });

  it('should keep the received time struck on its marker once the handle left it, and keep the handle out of the scroll gestures', () => {
    whenOpeningTheLateEndCorrection();
    whenDraggingTheHandleTo(22);

    thenTheReceivedTimeIsStruckAndTheHandleIgnoresTouchGestures();
  });

  const givenAPreviewOfTheLateEndCorrection = (): void => {
    cy.intercept('POST', `${suiviUrl}/apercus`, request => {
      const demande = request.body as components['schemas']['RestDemandeDApercu'];
      request.reply({
        body: apercuFixture(demande, dossierFinTardiveFixture(), dossierApresCorrectionFixture(), finCorrigeeFixture),
      });
    });
  };

  const whenPreviewingTheCorrection = (): void => {
    cy.get(dataSelector('anomalie-motif')).type(motifFinAutomatiqueFixture);
    cy.get(dataSelector('anomalie-previsualiser')).click();
    cy.get(dataSelector('anomalie-apercu')).should('be.visible');
  };

  const thenNoPreviewIsShown = (): void => {
    cy.get(dataSelector('anomalie-apercu')).should('not.exist');
  };

  const thenTheReceivedTimeIsStruckAndTheHandleIgnoresTouchGestures = (): void => {
    markerOf(finTardiveFixture).find(dataSelector('anomalie-pointage-heure')).should('have.css', 'text-decoration-line', 'line-through');
    cy.get(dataSelector('anomalie-poignee')).should('have.css', 'touch-action', 'none');
  };

  const whenOpeningTheLateEndCorrection = (): void => {
    cy.viewport(1280, 900);
    cy.visit(`/anomalies/${suiviFinAutomatiqueFixture}?pointage=${ouvrantFinAutomatiqueFixture}`);
    cy.get(dataSelector('anomalie-choix')).click();
  };

  const whenDraggingTheHandleTo = (hour: number): void => {
    cy.get(dataSelector('anomalie-frise-plan')).then(plan => {
      const { left, width } = requiredFixture(plan[0], 'plan de la frise').getBoundingClientRect();
      const clientX = left + (width * (hour - echelleDebutHeure)) / echelleDureeHeures;
      cy.get(dataSelector('anomalie-poignee')).trigger('pointerdown', { pointerId: 1, buttons: 1 });
      cy.get(dataSelector('anomalie-poignee')).trigger('pointermove', { pointerId: 1, buttons: 1, clientX });
      cy.get(dataSelector('anomalie-poignee')).trigger('pointerup', { pointerId: 1, clientX });
    });
  };

  const thenTheTimeFieldShows = (instant: Date): void => {
    thenTheInstantFieldsShow(instant);
  };
});
