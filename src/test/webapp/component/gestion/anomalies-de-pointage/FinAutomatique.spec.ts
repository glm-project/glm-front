import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';
import { abscisseDeLHeureLueSurLesGraduations } from '../../../utils/gestion/anomalies-de-pointage/AbscisseSurLaFrise';
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
import { thenTheInstantFieldsAreEmpty, thenTheInstantFieldsShow } from '../../../utils/gestion/anomalies-de-pointage/InstantField';
import { markerOf, thenPointageIsSelected, whenSelectingPointage } from '../../../utils/gestion/anomalies-de-pointage/SelectionDuPointage';

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

const whenOpeningTheDossierAndChoosing = (): void => {
  cy.viewport(1280, 900);
  cy.visit(`/anomalies/${suiviFinAutomatiqueFixture}?pointage=${ouvrantFinAutomatiqueFixture}`);
  cy.get(dataSelector('anomalie-choix')).click();
};

describe('Late end handle on the frise in Gestion', () => {
  const suiviUrl = `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`;

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

  it('should keep the handle while the previewed state is drawn under the frise', () => {
    givenAPreviewOfTheLateEndCorrection();

    whenOpeningTheLateEndCorrection();
    whenPreviewingTheCorrection();

    thenTheHandleStaysWithTheStateAfterTheAct();
  });

  it('should withdraw the previewed state drawn under the frise as soon as the handle moves', () => {
    givenAPreviewOfTheLateEndCorrection();

    whenOpeningTheLateEndCorrection();
    whenPreviewingTheCorrection();
    whenDraggingTheHandleTo(22);

    thenNoStateAfterTheActIsDrawn();
  });

  const thenTheHandleStaysWithTheStateAfterTheAct = (): void => {
    cy.get(dataSelector('anomalie-poignee')).should('exist');
    cy.get(dataSelector('anomalie-frise-apres')).should('exist');
    cy.get(dataSelector('anomalie-apercu-activite-apres')).should('have.attr', 'data-etat', 'TERMINEE');
  };

  const thenNoStateAfterTheActIsDrawn = (): void => {
    cy.get(dataSelector('anomalie-poignee')).should('exist');
    cy.get(dataSelector('anomalie-frise-apres')).should('not.exist');
  };

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

  const whenOpeningTheLateEndCorrection = whenOpeningTheDossierAndChoosing;

  const whenDraggingTheHandleTo = (hour: number): void => {
    cy.get(dataSelector('anomalie-frise-plan')).then(plan => {
      const { left, width } = requiredFixture(plan[0], 'plan de la frise').getBoundingClientRect();
      abscisseDeLHeureLueSurLesGraduations(hour, width).then(abscisse => {
        const clientX = left + abscisse;
        cy.get(dataSelector('anomalie-poignee')).trigger('pointerdown', { pointerId: 1, buttons: 1 });
        cy.get(dataSelector('anomalie-poignee')).trigger('pointermove', { pointerId: 1, buttons: 1, clientX });
        cy.get(dataSelector('anomalie-poignee')).trigger('pointerup', { pointerId: 1, clientX });
      });
    });
  };

  const thenTheTimeFieldShows = (instant: Date): void => {
    thenTheInstantFieldsShow(instant);
  };
});

describe('End placement on the frise in Gestion', () => {
  const suiviUrl = `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`;

  beforeEach(() => {
    cy.clock(new Date(2026, 8, 15, 10, 0).getTime(), ['Date']);
    givenTheReferentielFinAutomatique();
    cy.intercept('GET', suiviUrl, { body: dossierFinAutomatiqueFixture() });
  });

  it('should invent no hour while the manager has not placed the end, and say how to place it', () => {
    whenOpeningTheAutomaticEndRegularisation();

    thenNoHourIsInventedAndTheEndCanBePlaced();
  });

  it('should place the handle and the hour at the time clicked on the pointages row, rounded to five minutes', () => {
    whenOpeningTheAutomaticEndRegularisation();
    whenClickingThePointagesRowAt(17 + 2 / 60);

    thenTheEndIsPlacedAt(new Date(2026, 8, 14, 17, 0));
  });

  it('should bring a click before the start of the activity back to its start', () => {
    whenOpeningTheAutomaticEndRegularisation();
    whenClickingThePointagesRowAt(7.5);

    thenTheEndIsPlacedAt(new Date(2026, 8, 14, 8, 0));
  });

  it('should select the pointage of a marker clicked on the pointages row instead of placing the end', () => {
    whenOpeningTheAutomaticEndRegularisation();
    whenSelectingPointage(ouvrantFinAutomatiqueFixture);

    thenPointageIsSelected(ouvrantFinAutomatiqueFixture);
    thenTheInstantFieldsAreEmpty();
  });

  const whenOpeningTheAutomaticEndRegularisation = whenOpeningTheDossierAndChoosing;

  const whenClickingThePointagesRowAt = (hour: number): void => {
    cy.get(dataSelector('anomalie-frise-placement')).then(rangee => {
      const { width } = requiredFixture(rangee[0], 'rangée de placement').getBoundingClientRect();
      abscisseDeLHeureLueSurLesGraduations(hour, width).then(abscisse => {
        cy.get(dataSelector('anomalie-frise-placement')).click(abscisse, 20);
      });
    });
  };

  const thenNoHourIsInventedAndTheEndCanBePlaced = (): void => {
    thenTheInstantFieldsAreEmpty();
    cy.get(dataSelector('anomalie-poignee')).should('not.exist');
    cy.get(dataSelector('anomalie-previsualiser')).should('be.disabled');
    cy.get(dataSelector('anomalie-frise-aide'))
      .should('be.visible')
      .and('contain.text', 'Cliquez sur la frise pour placer l’heure du fait');
  };

  const thenTheEndIsPlacedAt = (instant: Date): void => {
    thenTheInstantFieldsShow(instant);
    cy.get(dataSelector('anomalie-poignee')).should('be.visible');
    cy.get(dataSelector('anomalie-frise-placement')).should('not.exist');
    cy.get(dataSelector('anomalie-frise-aide')).should('not.exist');
  };
});

describe('Pointage pointed after the deadline on the frise in Gestion', () => {
  const suiviUrl = `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`;

  beforeEach(() => {
    givenTheReferentielFinAutomatique();
  });

  (['CORRIGER_FIN_TARDIVE', 'CORRIGER_TRANSITION_TARDIVE'] as const).forEach(code => {
    it(`should mark on the frise the pointage the ${code} choice corrects`, () => {
      givenALateGestureCorrectedBy(code);

      whenOpeningTheLateGesture();

      thenOnlyTheLatePointageIsMarkedOnTheFrise();
    });

    it(`should say in the selection that the pointage the ${code} choice corrects was pointed after the deadline`, () => {
      givenALateGestureCorrectedBy(code);

      whenOpeningTheLateGesture();
      whenSelectingPointage(finTardiveFixture);

      thenTheSelectionSaysTheGestureWasPointedAfterTheDeadline();
    });
  });

  const thenTheSelectionSaysTheGestureWasPointedAfterTheDeadline = (): void => {
    cy.get(dataSelector('anomalie-selection')).should('contain.text', 'Pointé après l’échéance');
  };

  const givenALateGestureCorrectedBy = (code: 'CORRIGER_FIN_TARDIVE' | 'CORRIGER_TRANSITION_TARDIVE'): void => {
    cy.intercept('GET', suiviUrl, { body: dossierFinTardiveFixture(code) });
  };

  const whenOpeningTheLateGesture = (): void => {
    cy.viewport(1280, 900);
    cy.visit(`/anomalies/${suiviFinAutomatiqueFixture}?pointage=${ouvrantFinAutomatiqueFixture}`);
  };

  const thenOnlyTheLatePointageIsMarkedOnTheFrise = (): void => {
    markerOf(finTardiveFixture)
      .should('have.attr', 'data-tardif', 'true')
      .and('have.attr', 'aria-label')
      .and('contain', 'pointé après l’échéance');
    markerOf(finTardiveFixture).find(dataSelector('anomalie-pointage-tardif')).should('be.visible');
    markerOf(ouvrantFinAutomatiqueFixture).should('have.attr', 'data-tardif', 'false');
  };
});
