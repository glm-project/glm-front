import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';
import { abscisseDeLHeure, centreDe } from '../../../utils/gestion/anomalies-de-pointage/AbscisseSurLaFrise';
import {
  activiteFinAutomatiqueFixture,
  apercuFixture,
  confirmationFinAutomatiqueFixture,
  dossierApresCorrectionFixture,
  dossierApresRegularisationFixture,
  dossierDeuxFinsAutomatiquesFixture,
  dossierFinAutomatiqueEtConflitFixture,
  dossierFinAutomatiqueFixture,
  dossierFinTardiveFixture,
  dossierFinTardiveLeLendemainFixture,
  finCorrigeeFixture,
  finRegulariseeFixture,
  finTardiveFixture,
  givenTheReferentielFinAutomatique,
  instantRegulariseLocalFixture,
  motifFinAutomatiqueFixture,
  operateurFinAutomatiqueFixture,
  ouvrantFinAutomatiqueFixture,
  ouvrantSuivantFixture,
  suiviFinAutomatiqueFixture,
} from '../../../utils/gestion/anomalies-de-pointage/FinAutomatiqueHttp.fixture';
import {
  CHAMP_DE_LA_VUE_DE_RESOLUTION,
  thenTheInstantFieldsAreEmpty,
  thenTheInstantFieldsShow,
  whenTypingTheInstant,
} from '../../../utils/gestion/anomalies-de-pointage/InstantField';
import { instantLocalFixture } from '../../../utils/gestion/anomalies-de-pointage/InstantLocal.fixture';
import { markerOf, whenSelectingPointage } from '../../../utils/gestion/anomalies-de-pointage/SelectionDuPointage';

const MARGE_DES_REPERES_PX = 22;
const POINT_DE_PRISE_PX = 10;

const whenOpeningTheFriseAt = (width: number): void => {
  cy.viewport(width, 900);
  cy.visit(`/anomalies/${suiviFinAutomatiqueFixture}?pointage=${ouvrantFinAutomatiqueFixture}`);
  cy.get(dataSelector('anomalie-frise')).should('be.visible');
};

const barreDeLActivite = () =>
  cy
    .get(dataSelector('anomalie-frise'))
    .find(dataSelector('anomalie-activite'))
    .filter(`[data-activite="${activiteFinAutomatiqueFixture}"]`);

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
      whenReachingTheTimeField();

      thenTheTimeIsReachableWithoutHorizontalOverflow();
    });
  });

  const whenOpeningTheAutomaticEndAt = (width: number): void => {
    cy.viewport(width, 900);
    cy.visit(`/anomalies/${suiviFinAutomatiqueFixture}?pointage=${ouvrantFinAutomatiqueFixture}`);
    cy.get(dataSelector('anomalie-probleme')).should('be.visible');
  };

  const whenReachingTheTimeField = (): void => {
    cy.get(dataSelector('anomalie-resolution-instant-heure')).scrollIntoView();
  };

  const thenTheTimeIsReachableWithoutHorizontalOverflow = (): void => {
    cy.get(dataSelector('anomalie-resolution-instant-date')).should('be.visible').and('have.value', '');
    cy.get(dataSelector('anomalie-resolution-instant-heure')).should('be.visible').and('have.value', '');
    cy.get(dataSelector('anomalie-resolution-instant-horloge')).should('be.visible');
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth).to.equal(document.documentElement.clientWidth);
    });
  };
});

describe('Resolution view of an automatic end in Gestion', () => {
  const suiviUrl = `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`;

  beforeEach(() => {
    cy.clock(new Date(2026, 8, 15, 10, 0).getTime(), ['Date']);
    givenTheReferentielFinAutomatique();
  });

  it('should show the problem, the frise, the end field and the validation, and nothing of the full view', () => {
    givenTheDossier(dossierFinAutomatiqueFixture());

    whenOpeningTheResolutionView();

    thenOnlyTheResolutionViewIsDrawn();
  });

  it('should fall back to the full view when the dossier carries a conflict choice beside the end', () => {
    givenTheDossier(dossierFinAutomatiqueEtConflitFixture());

    whenOpeningTheDossier();

    thenTheFullViewIsDrawnWithItsTwoChoices();
  });

  it('should say the other automatic end of the element and lead to it, keeping the way back to the list', () => {
    givenTheDossier(dossierDeuxFinsAutomatiquesFixture());

    whenOpeningTheResolutionViewFromTheList();

    thenTheOtherAutomaticEndIsLinked();
  });

  it('should draw the other automatic end on the frise beside the one the manager regularises', () => {
    givenTheDossier(dossierDeuxFinsAutomatiquesFixture());

    whenOpeningTheResolutionView();

    thenTwoBarsAreDrawn();
  });

  it('should leave to the full view without any hour when the manager asks for another correction, then come back', () => {
    givenTheDossier(dossierFinAutomatiqueFixture());
    whenOpeningTheResolutionView();

    whenAskingForAnotherCorrection();

    thenTheFullViewIsDrawnWithAWayBack();
  });

  it('should come back to a fresh resolution view from the full view', () => {
    givenTheDossier(dossierFinAutomatiqueFixture());
    whenOpeningTheResolutionView();
    whenAskingForAnotherCorrection();

    whenComingBackToTheSimpleView();

    thenOnlyTheResolutionViewIsDrawn();
  });

  it('should ask a confirmation before leaving to the full view once an hour was entered', () => {
    givenTheDossier(dossierFinAutomatiqueFixture());
    whenOpeningTheResolutionView();
    whenTypingTheEnd();

    whenAskingForAnotherCorrection();

    thenAConfirmationIsAsked();
  });

  it('should say the outcome in one line and keep its detail folded, without any reason', () => {
    givenTheDossier(dossierFinAutomatiqueFixture());
    givenAPreviewOfTheRegularisation();
    whenOpeningTheResolutionView();

    whenTypingTheEnd();

    thenTheOutcomeIsInOneLineWithAFoldedDetail();
  });

  it('should not offer the next anomaly while the end is not validated', () => {
    givenTheDossier(dossierFinAutomatiqueFixture());
    givenAPreviewOfTheRegularisation();
    whenOpeningTheResolutionView();

    whenTypingTheEnd();

    thenTheNextAnomalyIsNotOffered();
  });

  it('should offer the next anomaly with the receipt once the end is validated', () => {
    givenTheDossier(dossierFinAutomatiqueFixture());
    givenAPreviewOfTheRegularisation();
    givenAConfirmationOf(dossierApresRegularisationFixture());
    whenOpeningTheResolutionView();

    whenTypingTheEnd();
    whenValidating();

    thenTheNextAnomalyIsOfferedWithTheReceipt();
  });

  const givenTheDossier = (dossier: components['schemas']['RestDossierAnomalie']): void => {
    cy.intercept('GET', suiviUrl, { body: dossier });
  };

  const givenAPreviewOfTheRegularisation = (): void => {
    cy.intercept('POST', `${suiviUrl}/apercus`, request => {
      const demande = request.body as components['schemas']['RestDemandeDApercu'];
      request.reply({
        body: apercuFixture(demande, dossierFinAutomatiqueFixture(), dossierApresRegularisationFixture(), finRegulariseeFixture),
      });
    });
  };

  const whenOpeningTheDossier = (): void => {
    cy.viewport(1280, 900);
    cy.visit(`/anomalies/${suiviFinAutomatiqueFixture}?pointage=${ouvrantFinAutomatiqueFixture}`);
  };

  const whenOpeningTheResolutionViewFromTheList = (): void => {
    cy.viewport(1280, 900);
    cy.visit(
      `/anomalies/${suiviFinAutomatiqueFixture}?nature=FIN_AUTOMATIQUE&operateur=${operateurFinAutomatiqueFixture}&page=2&pointage=${ouvrantFinAutomatiqueFixture}`,
    );
  };

  const whenTypingTheEnd = (): void => {
    whenTypingTheInstant(instantRegulariseLocalFixture, CHAMP_DE_LA_VUE_DE_RESOLUTION);
  };

  const whenAskingForAnotherCorrection = (): void => {
    cy.get(dataSelector('anomalie-resolution-autre-correction')).click();
  };

  const whenComingBackToTheSimpleView = (): void => {
    cy.get(dataSelector('anomalie-resolution-retour-simple')).click();
  };

  const thenOnlyTheResolutionViewIsDrawn = (): void => {
    cy.get(dataSelector('anomalie-probleme')).should('be.visible');
    cy.get(dataSelector('anomalie-frise')).should('be.visible');
    cy.get(dataSelector('anomalie-resolution-instant-date')).should('be.visible').and('have.value', '');
    cy.get(dataSelector('anomalie-resolution-valider')).should('be.disabled');
    [
      'anomalie-selection',
      'anomalie-decision',
      'anomalie-choix',
      'anomalie-motif',
      'anomalie-instant-moins-5',
      'anomalie-instant-plus-5',
      'anomalie-champs-detail',
      'anomalie-previsualiser',
    ].forEach(absent => {
      cy.get(dataSelector(absent)).should('not.exist');
    });
  };

  const thenTheFullViewIsDrawnWithItsTwoChoices = (): void => {
    cy.get(dataSelector('anomalie-choix')).should('have.length', 2);
    cy.get(dataSelector('anomalie-resolution')).should('not.exist');
  };

  const thenTheOtherAutomaticEndIsLinked = (): void => {
    cy.get(dataSelector('anomalie-resolution-autre-fin'))
      .should('contain.text', '1 autre fin automatique sur cet élément')
      .and('have.attr', 'href')
      .and('contain', `pointage=${ouvrantSuivantFixture}`)
      .and('contain', 'nature=FIN_AUTOMATIQUE')
      .and('contain', 'page=2');
  };

  const thenTwoBarsAreDrawn = (): void => {
    cy.get(dataSelector('anomalie-frise')).find(dataSelector('anomalie-activite')).should('have.length', 2);
  };

  const thenTheFullViewIsDrawnWithAWayBack = (): void => {
    cy.get(dataSelector('anomalie-choix')).should('have.length', 1).and('have.attr', 'aria-pressed', 'false');
    cy.get(dataSelector('anomalie-acte')).should('not.exist');
    cy.get(dataSelector('anomalie-resolution-retour-simple')).should('be.visible');
  };

  const thenAConfirmationIsAsked = (): void => {
    cy.get(dataSelector('anomalie-resolution-sortie')).should('be.visible');
    cy.get(dataSelector('anomalie-choix')).should('not.exist');
  };

  const thenTheOutcomeIsInOneLineWithAFoldedDetail = (): void => {
    cy.get(dataSelector('anomalie-resolution-apercu')).should('have.text', 'Travail 13 h → 9 h · anomalie traitée');
    cy.get(dataSelector('anomalie-resolution-detail')).should('not.have.attr', 'open');
    cy.get(dataSelector('anomalie-resolution-valider')).should('be.enabled').and('contain.text', 'Valider la fin à 17:00');
  };
});

describe('Resolution view of a pointage pointed after the deadline in Gestion', () => {
  const suiviUrl = `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`;
  const MOTIF_FIN_TARDIVE = 'Arrêt pointé après l’échéance : heure vérifiée en gestion';
  const MOTIF_PASSAGE_TARDIF = 'Passage pointé après l’échéance : heure vérifiée en gestion';

  beforeEach(() => {
    cy.clock(new Date(2026, 8, 15, 10, 0).getTime(), ['Date']);
    givenTheReferentielFinAutomatique();
  });

  it('should open a late end on its received hour and preview its correction by itself, with the reason fixed and hidden', () => {
    givenALateGesture('CORRIGER_FIN_TARDIVE');

    whenOpeningTheResolutionView();

    whenUnfoldingTheDetailOfThePreview();

    thenTheEndStandsOnTheReceivedHour();
    thenThePreviewWasAskedWithTheReason(MOTIF_FIN_TARDIVE);
    thenTheOutcomeIsInOneLineAndTheValidationIsOpen('Valider la fin à 23:00');
    thenNoReasonIsShown(MOTIF_FIN_TARDIVE);
  });

  it('should label a late passage and say what its hour starts', () => {
    givenALateGesture('CORRIGER_TRANSITION_TARDIVE');

    whenOpeningTheResolutionView();

    thenTheFieldIsLabelled('Heure du passage');
    thenTheOpenActivityIsSaid('La non-conformité commencera à cette heure.');
    thenThePreviewWasAskedWithTheReason(MOTIF_PASSAGE_TARDIF);
    thenTheOutcomeIsInOneLineAndTheValidationIsOpen('Valider le passage à 23:00');
  });

  it('should leave to the full view with no act chosen when the manager asks for another correction', () => {
    givenALateGesture('CORRIGER_FIN_TARDIVE');
    whenOpeningTheResolutionView();

    whenAskingForAnotherCorrection();

    thenTheFullViewOffersTheCorrectionWithoutChoosingIt();
  });

  const whenAskingForAnotherCorrection = (): void => {
    cy.get(dataSelector('anomalie-resolution-autre-correction')).click();
  };

  const whenUnfoldingTheDetailOfThePreview = (): void => {
    cy.get(dataSelector('anomalie-resolution-detail-ouvrir')).click();
  };

  const thenTheFieldIsLabelled = (legende: string): void => {
    cy.get(dataSelector('anomalie-resolution-instant-date')).closest('fieldset').find('legend').should('have.text', legende);
  };

  const thenTheOpenActivityIsSaid = (ligne: string): void => {
    cy.get(dataSelector('anomalie-resolution-activite-ouverte')).should('have.text', ligne);
  };

  const thenTheFullViewOffersTheCorrectionWithoutChoosingIt = (): void => {
    cy.get(dataSelector('anomalie-choix')).should('have.length', 1).and('have.attr', 'aria-pressed', 'false');
    cy.get(dataSelector('anomalie-acte')).should('not.exist');
  };

  it('should offer the next anomaly with the receipt of the correction of a late pointage', () => {
    givenALateGesture('CORRIGER_TRANSITION_TARDIVE');
    givenAConfirmationOf(dossierApresCorrectionFixture());
    whenOpeningTheResolutionView();

    whenValidating();

    thenTheNextAnomalyIsOfferedWithTheReceipt();
  });

  const givenALateGesture = (code: 'CORRIGER_FIN_TARDIVE' | 'CORRIGER_TRANSITION_TARDIVE'): void => {
    cy.intercept('GET', suiviUrl, { body: dossierFinTardiveFixture(code) });
    cy.intercept('POST', `${suiviUrl}/apercus`, request => {
      const demande = request.body as components['schemas']['RestDemandeDApercu'];
      request.reply({
        body: apercuFixture(demande, dossierFinTardiveFixture(code), dossierApresCorrectionFixture(), finCorrigeeFixture),
      });
    }).as('apercu');
  };

  const thenTheEndStandsOnTheReceivedHour = (): void => {
    thenTheInstantFieldsShow(new Date(2026, 8, 14, 23, 0), CHAMP_DE_LA_VUE_DE_RESOLUTION);
    abscisseDeLHeure(23).then(abscisse => {
      cy.get(dataSelector('anomalie-poignee')).should(poignee => {
        expect(centreDe(requiredFixture(poignee[0], 'poignée'))).to.be.closeTo(abscisse, 1);
      });
    });
  };

  const thenThePreviewWasAskedWithTheReason = (motif: string): void => {
    cy.wait('@apercu').its('request.body.acte').should('include', { kind: 'CORRECTION', pointage: finTardiveFixture, motif });
  };

  const thenTheOutcomeIsInOneLineAndTheValidationIsOpen = (bouton: string): void => {
    cy.get(dataSelector('anomalie-resolution-apercu')).should('have.text', 'Travail 13 h → 15 h · anomalie traitée');
    cy.get(dataSelector('anomalie-resolution-valider')).should('be.enabled').and('contain.text', bouton);
  };

  const thenNoReasonIsShown = (motif: string): void => {
    cy.get(dataSelector('anomalie-motif')).should('not.exist');
    cy.get(dataSelector('anomalie-resolution')).should('not.contain.text', motif);
    cy.get(dataSelector('anomalie-resolution')).should('not.contain.text', motifFinAutomatiqueFixture);
  };
});

const whenOpeningTheDossierAndChoosing = (): void => {
  cy.viewport(1280, 900);
  cy.visit(`/anomalies/${suiviFinAutomatiqueFixture}?pointage=${ouvrantFinAutomatiqueFixture}`);
  cy.get(dataSelector('anomalie-resolution-autre-correction')).click();
  cy.get(dataSelector('anomalie-choix')).click();
};

const givenAConfirmationOf = (dossier: components['schemas']['RestDossierAnomalie']): void => {
  cy.intercept('POST', `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/confirmations-de-resolution`, request => {
    const demande = request.body as components['schemas']['RestConfirmationAEnregistrer'];
    request.reply({ body: confirmationFinAutomatiqueFixture(demande, dossier) });
  });
};

const whenValidating = (): void => {
  cy.get(dataSelector('anomalie-resolution-valider')).should('be.enabled').click();
};

const thenTheNextAnomalyIsNotOffered = (): void => {
  cy.get(dataSelector('anomalie-resolution-suivante')).should('not.exist');
};

const thenTheNextAnomalyIsOfferedWithTheReceipt = (): void => {
  cy.get(dataSelector('anomalie-resultat')).should('contain.text', 'Anomalie traitée');
  cy.get(dataSelector('anomalie-resolution-suivante')).should('be.visible').and('be.enabled').and('contain.text', 'Anomalie suivante');
};

const whenOpeningTheResolutionView = (): void => {
  cy.viewport(1280, 900);
  cy.visit(`/anomalies/${suiviFinAutomatiqueFixture}?pointage=${ouvrantFinAutomatiqueFixture}`);
  cy.get(dataSelector('anomalie-resolution')).should('be.visible');
};

const whenDraggingTheHandleTo = (hour: number): void => {
  abscisseDeLHeure(hour).then(clientX => {
    cy.get(dataSelector('anomalie-poignee')).trigger('pointerdown', { pointerId: 1, buttons: 1 });
    cy.get(dataSelector('anomalie-poignee')).trigger('pointermove', { pointerId: 1, buttons: 1, clientX });
    cy.get(dataSelector('anomalie-poignee')).trigger('pointerup', { pointerId: 1, clientX });
  });
};

const whenPressingEndOnTheHandle = (): void => {
  cy.get(dataSelector('anomalie-poignee')).focus();
  cy.get(dataSelector('anomalie-poignee')).trigger('keydown', { key: 'End' });
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

  it('should stand the handle on the hour of the proposed end', () => {
    whenOpeningTheLateEndCorrection();

    thenTheHandleStandsOnTheHour(23);
  });

  it('should hold the handle 22 pixels from the right edge of the scale when End carries it three hours after the last received instant', () => {
    whenOpeningTheLateEndCorrection();
    whenPressingEndOnTheHandle();

    thenTheTimeFieldShows(new Date(2026, 8, 15, 2, 0));
    thenTheHandleIsHeldAtTheRightEdgeOfTheScale();
  });

  it('should stand the markers and the bar after the act under the ones above that hold the same instants', () => {
    givenAPreviewOfTheLateEndCorrection();

    whenOpeningTheLateEndCorrection();
    whenPreviewingTheCorrection();

    thenTheStateAfterTheActStandsUnderTheOneAbove();
  });

  const thenTheHandleStandsOnTheHour = (hour: number): void => {
    abscisseDeLHeure(hour).then(abscisse => {
      cy.get(dataSelector('anomalie-poignee')).should(poignee => {
        expect(centreDe(requiredFixture(poignee[0], 'poignée'))).to.be.closeTo(abscisse, 1);
      });
    });
  };

  const thenTheHandleIsHeldAtTheRightEdgeOfTheScale = (): void => {
    cy.get(dataSelector('anomalie-frise-plan')).then(plan => {
      const { right } = requiredFixture(plan[0], 'plan de la frise').getBoundingClientRect();
      cy.get(dataSelector('anomalie-poignee')).should(poignee => {
        expect(centreDe(requiredFixture(poignee[0], 'poignée'))).to.be.closeTo(right - MARGE_DES_REPERES_PX, 1);
      });
    });
  };

  const thenTheStateAfterTheActStandsUnderTheOneAbove = (): void => {
    markerOf(ouvrantFinAutomatiqueFixture).then(dessus => {
      cy.get(dataSelector('anomalie-apres-pointage'))
        .filter(`[data-pointage="${ouvrantFinAutomatiqueFixture}"]`)
        .should(dessous => {
          expect(centreDe(requiredFixture(dessous[0], 'repère après l’acte'))).to.be.closeTo(
            centreDe(requiredFixture(dessus[0], 'repère')),
            1,
          );
        });
    });
    cy.get(dataSelector('anomalie-frise'))
      .find(dataSelector('anomalie-activite'))
      .then(dessus => {
        cy.get(dataSelector('anomalie-apercu-activite-apres')).should(dessous => {
          expect(requiredFixture(dessous[0], 'barre après l’acte').getBoundingClientRect().left).to.be.closeTo(
            requiredFixture(dessus[0], 'barre').getBoundingClientRect().left,
            1,
          );
        });
      });
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

  it('should place the handle and the hour at the time clicked on the bar, rounded to five minutes', () => {
    whenOpeningTheAutomaticEndRegularisation();
    whenClickingTheRowOfTheBarAt(17 + 2 / 60);

    thenTheEndIsPlacedAt(new Date(2026, 8, 14, 17, 0));
  });

  it('should bring a click before the start of the activity back to its start', () => {
    whenOpeningTheAutomaticEndRegularisation();
    whenClickingTheRowOfTheBarAt(7.5);

    thenTheEndIsPlacedAt(new Date(2026, 8, 14, 8, 0));
  });

  it('should place the hour at the first move of the handle of the received end dragged without being released', () => {
    whenOpeningTheAutomaticEndRegularisation();
    whenDraggingTheHourlessHandleTo(15);

    thenTheEndIsPlacedAt(new Date(2026, 8, 14, 15, 0));
  });

  it('should go on moving the hour while the handle dragged from the received end is still not released', () => {
    whenOpeningTheAutomaticEndRegularisation();
    whenDraggingTheHourlessHandleTo(15);
    whenGoingOnDraggingTheHandleTo(16);

    thenTheEndIsPlacedAt(new Date(2026, 8, 14, 16, 0));
  });

  it('should draw the start marker as an image that selects nothing and places no end', () => {
    whenOpeningTheAutomaticEndRegularisation();

    thenTheStartMarkerIsAnImageThatCannotBePressed();
    thenTheInstantFieldsAreEmpty(CHAMP_DE_LA_VUE_DE_RESOLUTION);
  });

  const whenOpeningTheAutomaticEndRegularisation = whenOpeningTheResolutionView;

  const whenClickingTheRowOfTheBarAt = (hour: number): void => {
    cy.get(dataSelector('anomalie-frise-placement')).then(rangee => {
      const { left } = requiredFixture(rangee[0], 'rangée de placement').getBoundingClientRect();
      abscisseDeLHeure(hour).then(clientX => {
        cy.get(dataSelector('anomalie-frise-placement')).click(clientX - left, 20);
      });
    });
  };

  const whenDraggingTheHourlessHandleTo = (hour: number): void => {
    abscisseDeLHeure(hour).then(clientX => {
      cy.get(dataSelector('anomalie-poignee')).trigger('pointerdown', { pointerId: 1, buttons: 1 });
      cy.get(dataSelector('anomalie-poignee')).trigger('pointermove', { pointerId: 1, buttons: 1, clientX });
    });
  };

  const whenGoingOnDraggingTheHandleTo = (hour: number): void => {
    abscisseDeLHeure(hour).then(clientX => {
      cy.get(dataSelector('anomalie-poignee')).trigger('pointermove', { pointerId: 1, buttons: 1, clientX });
    });
  };

  const thenNoHourIsInventedAndTheEndCanBePlaced = (): void => {
    thenTheInstantFieldsAreEmpty(CHAMP_DE_LA_VUE_DE_RESOLUTION);
    cy.get(dataSelector('anomalie-poignee')).should('have.attr', 'data-sans-heure');
    cy.get(dataSelector('anomalie-poignee')).should('not.have.attr', 'aria-valuenow');
    cy.get(dataSelector('anomalie-poignee'))
      .invoke('text')
      .should('match', /^\s*Heure \?\s*$/);
    cy.get(dataSelector('anomalie-resolution-valider')).should('be.disabled');
    cy.get(dataSelector('anomalie-frise-aide'))
      .should('be.visible')
      .and('contain.text', 'Tirez le bout de la barre ou cliquez dessus pour placer la fin réelle');
  };

  const thenTheEndIsPlacedAt = (instant: Date): void => {
    thenTheInstantFieldsShow(instant, CHAMP_DE_LA_VUE_DE_RESOLUTION);
    cy.get(dataSelector('anomalie-poignee')).should('be.visible');
    cy.get(dataSelector('anomalie-frise-placement')).should('not.exist');
    cy.get(dataSelector('anomalie-frise-aide')).should('not.exist');
  };

  const thenTheStartMarkerIsAnImageThatCannotBePressed = (): void => {
    markerOf(ouvrantFinAutomatiqueFixture).should('have.attr', 'role', 'img').and('not.have.attr', 'aria-pressed');
  };
});

describe('Automatic end read on one line in Gestion', () => {
  const suiviUrl = `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`;

  beforeEach(() => {
    cy.clock(new Date(2026, 8, 15, 10, 0).getTime(), ['Date']);
    givenTheReferentielFinAutomatique();
    cy.intercept('GET', suiviUrl, { body: dossierFinAutomatiqueFixture() });
    cy.intercept('POST', `${suiviUrl}/apercus`, request => {
      const demande = request.body as components['schemas']['RestDemandeDApercu'];
      request.reply({
        body: apercuFixture(demande, dossierFinAutomatiqueFixture(), dossierApresRegularisationFixture(), finRegulariseeFixture),
      });
    });
    cy.intercept('POST', `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/confirmations-de-resolution`, request => {
      const demande = request.body as components['schemas']['RestConfirmationAEnregistrer'];
      request.reply({ body: confirmationFinAutomatiqueFixture(demande, dossierApresRegularisationFixture()) });
    });
  });

  [1280, 390].forEach(width => {
    it(`should begin the start marker on the graduation of its hour and on the left edge of its bar at ${width} pixels`, () => {
      whenOpeningTheFriseAt(width);

      thenNoTitleIsDrawnForThePointages();
      thenTheStartMarkerBeginsOnTheHourAndOnTheLeftEdgeOfItsBar(ouvrantFinAutomatiqueFixture, 8);
    });

    it(`should end the regularised stop at the end of its bar at ${width} pixels`, () => {
      whenOpeningTheFriseAt(width);
      whenRegularisingTheEndAndReadingTheReceipt();

      thenTheStopEndsOnTheHourAndOnTheRightEdgeOfItsBar(finRegulariseeFixture, 17);
    });
  });

  [15, 18].forEach(hour => {
    it(`should move the proposed hour and the width of the bar to ${hour}:00 when the end of the bar is dragged there`, () => {
      whenOpeningTheFriseAt(1280);
      whenPlacingTheEndAt(17);
      whenDraggingTheHandleTo(hour);

      thenTheInstantFieldsShow(new Date(2026, 8, 14, hour, 0), CHAMP_DE_LA_VUE_DE_RESOLUTION);
      thenTheBarEndsOnTheHour(hour);
      thenTheBarIsNamedWithTheProposedHour(`${hour}:00`);
    });
  });

  it('should move the hour placed by a click on the bar when its handle is then dragged earlier', () => {
    whenOpeningTheFriseAt(1280);
    whenPlacingTheEndAt(17);
    whenDraggingTheHandleTo(12);

    thenTheInstantFieldsShow(new Date(2026, 8, 14, 12, 0), CHAMP_DE_LA_VUE_DE_RESOLUTION);
    thenTheBarEndsOnTheHour(12);
    thenTheBarIsNamedWithTheProposedHour('12:00');
  });

  it('should keep the grab offset when the handle placed by a click is grabbed off-centre and dragged earlier', () => {
    whenOpeningTheFriseAt(1280);
    whenPlacingTheEndAt(17);
    whenDraggingTheHandleGrabbedOffCentreTo(12);

    thenTheInstantFieldsShow(new Date(2026, 8, 14, 12, 0), CHAMP_DE_LA_VUE_DE_RESOLUTION);
    thenTheBarEndsOnTheHour(12);
  });

  it('should move the hour typed in the field when its handle is then dragged earlier', () => {
    whenOpeningTheFriseAt(1280);
    whenTypingTheEndAt(new Date(2026, 8, 14, 17, 0));
    whenDraggingTheHandleTo(12);

    thenTheInstantFieldsShow(new Date(2026, 8, 14, 12, 0), CHAMP_DE_LA_VUE_DE_RESOLUTION);
    thenTheBarEndsOnTheHour(12);
  });

  it('should hold the handle 22 pixels from the edge, on its bar, when End carries it to the last hour of the scale', () => {
    whenOpeningTheFriseAt(1280);
    whenPlacingTheEndAt(17);
    whenPressingEndOnTheHandle();

    thenTheHandleIsHeldOnItsBar();
  });

  it('should say the outcome of the preview in one line and draw no state after the act under the frise', () => {
    whenOpeningTheFriseAt(1280);
    whenPlacingTheEndAt(17);
    whenWaitingForThePreviewOfTheEnd();

    thenNoStateAfterTheActIsDrawn();
  });

  const whenPlacingTheEndAt = (hour: number): void => {
    cy.get(dataSelector('anomalie-frise-placement')).then(rangee => {
      const { left } = requiredFixture(rangee[0], 'rangée de placement').getBoundingClientRect();
      abscisseDeLHeure(hour).then(clientX => {
        cy.get(dataSelector('anomalie-frise-placement')).click(clientX - left, 20);
      });
    });
    cy.get(dataSelector('anomalie-poignee')).should('be.visible').and('not.have.attr', 'data-sans-heure');
  };

  const whenTypingTheEndAt = (instant: Date): void => {
    whenTypingTheInstant(instant, CHAMP_DE_LA_VUE_DE_RESOLUTION);
    cy.get(dataSelector('anomalie-resolution-instant-heure')).blur();
    cy.get(dataSelector('anomalie-poignee')).should('be.visible').and('not.have.attr', 'data-sans-heure');
  };

  const whenDraggingTheHandleGrabbedOffCentreTo = (hour: number): void => {
    cy.get(dataSelector('anomalie-poignee')).then(poignee => {
      const grabX = centreDe(requiredFixture(poignee[0], 'poignée')) + POINT_DE_PRISE_PX;
      abscisseDeLHeure(hour).then(abscisse => {
        cy.get(dataSelector('anomalie-poignee')).trigger('pointerdown', { pointerId: 1, buttons: 1, clientX: grabX });
        cy.get(dataSelector('anomalie-poignee')).trigger('pointermove', {
          pointerId: 1,
          buttons: 1,
          clientX: abscisse + POINT_DE_PRISE_PX,
        });
        cy.get(dataSelector('anomalie-poignee')).trigger('pointerup', { pointerId: 1, clientX: abscisse + POINT_DE_PRISE_PX });
      });
    });
  };

  const whenWaitingForThePreviewOfTheEnd = (): void => {
    cy.get(dataSelector('anomalie-resolution-apercu')).should('be.visible');
  };

  const thenNoStateAfterTheActIsDrawn = (): void => {
    cy.get(dataSelector('anomalie-frise-apres')).should('not.exist');
  };

  const thenTheBarEndsOnTheHour = (hour: number): void => {
    abscisseDeLHeure(hour).then(abscisse => {
      barreDeLActivite().should(barre => {
        expect(requiredFixture(barre[0], 'barre').getBoundingClientRect().right).to.be.closeTo(abscisse, 1);
      });
    });
    barreDeLActivite().should('have.attr', 'data-fin', 'PROPOSEE');
  };

  const thenTheBarIsNamedWithTheProposedHour = (hour: string): void => {
    barreDeLActivite().should('have.attr', 'aria-label').and('contain', `heure proposée ${hour}`);
  };

  const thenTheHandleIsHeldOnItsBar = (): void => {
    cy.get(dataSelector('anomalie-frise-plan')).then(plan => {
      const { right } = requiredFixture(plan[0], 'plan de la frise').getBoundingClientRect();
      barreDeLActivite().then(barre => {
        cy.get(dataSelector('anomalie-poignee')).should(poignee => {
          const handle = requiredFixture(poignee[0], 'poignée');
          const bar = requiredFixture(barre[0], 'barre');
          expect(centreDe(handle)).to.be.closeTo(right - MARGE_DES_REPERES_PX, 1);
          expect(handle.getBoundingClientRect().top).to.be.closeTo(bar.getBoundingClientRect().top, 1);
          expect(centreDe(handle)).to.be.within(bar.getBoundingClientRect().left, bar.getBoundingClientRect().right);
        });
      });
    });
  };

  const whenRegularisingTheEndAndReadingTheReceipt = (): void => {
    whenTypingTheInstant(instantRegulariseLocalFixture, CHAMP_DE_LA_VUE_DE_RESOLUTION);
    cy.get(dataSelector('anomalie-resolution-valider')).should('be.enabled').click();
    cy.get(dataSelector('anomalie-resultat')).should('be.visible');
    markerOf(finRegulariseeFixture).should('exist');
  };

  const thenNoTitleIsDrawnForThePointages = (): void => {
    cy.get(dataSelector('anomalie-frise-pointages-intitule')).should('not.exist');
  };

  const thenTheStartMarkerBeginsOnTheHourAndOnTheLeftEdgeOfItsBar = (pointage: string, hour: number): void => {
    abscisseDeLHeure(hour).then(abscisse => {
      barreDeLActivite().then(barre => {
        markerOf(pointage).should(repere => {
          const { left } = requiredFixture(repere[0], 'repère').getBoundingClientRect();
          expect(left).to.be.closeTo(abscisse, 1);
          expect(left).to.be.closeTo(requiredFixture(barre[0], 'barre').getBoundingClientRect().left, 1);
        });
      });
    });
  };

  const thenTheStopEndsOnTheHourAndOnTheRightEdgeOfItsBar = (pointage: string, hour: number): void => {
    abscisseDeLHeure(hour).then(abscisse => {
      barreDeLActivite().then(barre => {
        markerOf(pointage).should(repere => {
          const { right } = requiredFixture(repere[0], 'repère').getBoundingClientRect();
          expect(right).to.be.closeTo(abscisse, 1);
          expect(right).to.be.closeTo(requiredFixture(barre[0], 'barre').getBoundingClientRect().right, 1);
        });
      });
    });
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

      whenOpeningTheFullViewOfTheLateGesture();
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

  const whenOpeningTheFullViewOfTheLateGesture = (): void => {
    whenOpeningTheLateGesture();
    cy.get(dataSelector('anomalie-resolution-autre-correction')).click();
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

describe('Geometry of the frise in Gestion', () => {
  const suiviUrl = `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`;
  const instantProcheFixture = '71000000-0000-0000-0000-000000000010';

  beforeEach(() => {
    cy.clock(new Date(2026, 8, 15, 10, 0).getTime(), ['Date']);
    givenTheReferentielFinAutomatique();
  });

  it('should stand each marker on the graduation of its hour', () => {
    givenTheDossier(dossierFinTardiveFixture());

    whenOpeningTheFrise();

    thenTheMarkerStandsOnTheHour(ouvrantFinAutomatiqueFixture, 8);
    thenTheMarkerStandsOnTheHour(finTardiveFixture, 23);
  });

  it('should stretch the graduations from the left edge to the right edge of the frise', () => {
    givenTheDossier(dossierFinTardiveFixture());

    whenOpeningTheFullViewFrise();

    thenTheGraduationsSpanThePlan();
  });

  it('should stop the bar of an expired activity at its automatic end, short of the edge of the frise', () => {
    givenTheDossier(dossierFinTardiveFixture());

    whenOpeningTheFrise();

    thenTheBarRunsFromTo(8, 21);
    thenTheBarStopsShortOfTheEdge();
  });

  it('should lay a finished bar from its start to its received end', () => {
    givenTheDossier(withTheActivity({ etat: 'TERMINEE', fin: instantLocalFixture(new Date(2026, 8, 14, 21, 0)), duree: 'PT13H' }));

    whenOpeningTheFrise();

    thenTheBarRunsFromTo(8, 21);
  });

  it('should run an ongoing bar to the edge of the frise even when an end is received', () => {
    givenTheDossier(withTheActivity({ etat: 'EN_COURS', fin: instantLocalFixture(new Date(2026, 8, 14, 21, 0)) }));

    whenOpeningTheFrise();

    thenTheBarReachesTheEdge();
  });

  it('should lower a marker closer to the previous one than a touch target, and keep the far ones on one row', () => {
    givenTheDossier(withAPointageTenMinutesAfterTheLateEnd());

    whenOpeningTheFrise();

    thenTheMarkerStandsBelow(instantProcheFixture, finTardiveFixture);
    thenTheMarkersStandOnOneRow(ouvrantFinAutomatiqueFixture, finTardiveFixture);
  });

  const givenTheDossier = (dossier: components['schemas']['RestDossierAnomalie']): void => {
    cy.intercept('GET', suiviUrl, { body: dossier });
  };

  const withTheActivity = (
    changement: Partial<components['schemas']['RestActiviteDuDossier']>,
  ): components['schemas']['RestDossierAnomalie'] => {
    const dossier = dossierFinTardiveFixture();
    return {
      ...dossier,
      activites: dossier.activites.map(activite => ({ ...activite, ...changement })),
    };
  };

  const withAPointageTenMinutesAfterTheLateEnd = (): components['schemas']['RestDossierAnomalie'] => {
    const dossier = dossierFinTardiveFixture();
    const finTardive = requiredFixture(dossier.suivi.journal[1], 'fin tardive reçue');
    const perimetre = requiredFixture(dossier.perimetre, 'périmètre du dossier');
    return {
      ...dossier,
      perimetre: { ...perimetre, pointages: [...perimetre.pointages, instantProcheFixture] },
      suivi: {
        ...dossier.suivi,
        journal: [
          ...dossier.suivi.journal,
          { ...finTardive, id: instantProcheFixture, dateDeSurvenue: instantLocalFixture(new Date(2026, 8, 14, 23, 10)) },
        ],
      },
    };
  };

  const whenOpeningTheFrise = (): void => {
    cy.viewport(1280, 900);
    cy.visit(`/anomalies/${suiviFinAutomatiqueFixture}?pointage=${ouvrantFinAutomatiqueFixture}`);
    cy.get(dataSelector('anomalie-frise')).should('be.visible');
  };

  const whenOpeningTheFullViewFrise = (): void => {
    whenOpeningTheFrise();
    cy.get(dataSelector('anomalie-resolution-autre-correction')).click();
    cy.get(dataSelector('anomalie-frise')).should('be.visible');
  };

  const plan = () => cy.get(dataSelector('anomalie-frise-plan'));

  const barre = barreDeLActivite;

  const thenTheMarkerStandsOnTheHour = (pointage: string, hour: number): void => {
    abscisseDeLHeure(hour).then(abscisse => {
      markerOf(pointage).should(repere => {
        expect(centreDe(requiredFixture(repere[0], 'repère'))).to.be.closeTo(abscisse, 1);
      });
    });
  };

  const thenTheGraduationsSpanThePlan = (): void => {
    plan().then(element => {
      const { left, right } = requiredFixture(element[0], 'plan de la frise').getBoundingClientRect();
      abscisseDeLHeure(7).should(abscisse => {
        expect(abscisse).to.be.closeTo(left, 1);
      });
      abscisseDeLHeure(24).should(abscisse => {
        expect(abscisse).to.be.closeTo(right, 1);
      });
    });
  };

  const thenTheBarRunsFromTo = (debut: number, fin: number): void => {
    abscisseDeLHeure(debut).then(gauche => {
      abscisseDeLHeure(fin).then(droite => {
        barre().should(element => {
          const rect = requiredFixture(element[0], 'barre').getBoundingClientRect();
          expect(rect.left).to.be.closeTo(gauche, 1);
          expect(rect.right).to.be.closeTo(droite, 1);
        });
      });
    });
  };

  const thenTheBarStopsShortOfTheEdge = (): void => {
    plan().then(element => {
      const { right } = requiredFixture(element[0], 'plan de la frise').getBoundingClientRect();
      barre().should(barreRecue => {
        expect(requiredFixture(barreRecue[0], 'barre').getBoundingClientRect().right).to.be.lessThan(right - 1);
      });
    });
  };

  const thenTheBarReachesTheEdge = (): void => {
    plan().then(element => {
      const { right } = requiredFixture(element[0], 'plan de la frise').getBoundingClientRect();
      barre().should(barreRecue => {
        expect(requiredFixture(barreRecue[0], 'barre').getBoundingClientRect().right).to.be.closeTo(right, 1);
      });
    });
  };

  const thenTheMarkerStandsBelow = (dessous: string, dessus: string): void => {
    markerOf(dessus).then(haut => {
      markerOf(dessous).should(bas => {
        expect(requiredFixture(bas[0], 'repère').getBoundingClientRect().top).to.be.greaterThan(
          requiredFixture(haut[0], 'repère').getBoundingClientRect().bottom - 1,
        );
      });
    });
  };

  const thenTheMarkersStandOnOneRow = (premier: string, second: string): void => {
    markerOf(premier).then(gauche => {
      markerOf(second).should(droite => {
        expect(requiredFixture(droite[0], 'repère').getBoundingClientRect().top).to.be.closeTo(
          requiredFixture(gauche[0], 'repère').getBoundingClientRect().top,
          1,
        );
      });
    });
  };
});

describe('Frise of a dossier spanning 26 hours in Gestion', () => {
  const suiviUrl = `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`;

  beforeEach(() => {
    cy.clock(new Date(2026, 8, 15, 12, 0).getTime(), ['Date']);
    givenTheReferentielFinAutomatique();
    cy.intercept('GET', suiviUrl, { body: dossierFinTardiveLeLendemainFixture() });
  });

  [1280, 768, 390].forEach(width => {
    it(`should fit the page and the frise in ${width} pixels, with the late pointage of the next day on the frise`, () => {
      whenOpeningTheFriseAt(width);

      thenNeitherThePageNorTheFriseOverflows();
      thenTheLatePointageStandsOnTheFrise();
    });
  });

  it('should hold the earliest and the latest markers 22 pixels away from the edges of the plan of a narrow frise', () => {
    whenOpeningTheFriseAt(390);

    thenTheMarkersAreHeldAwayFromTheEdgesOfThePlan([ouvrantFinAutomatiqueFixture, finTardiveFixture]);
  });

  const thenNeitherThePageNorTheFriseOverflows = (): void => {
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth).to.equal(document.documentElement.clientWidth);
    });
    cy.get(dataSelector('anomalie-frise')).should(frise => {
      const element = requiredFixture(frise[0], 'frise');
      expect(element.scrollWidth).to.equal(element.clientWidth);
    });
  };

  const thenTheMarkersAreHeldAwayFromTheEdgesOfThePlan = (pointages: readonly string[]): void => {
    cy.get(dataSelector('anomalie-frise-plan')).then(plan => {
      const { left, right } = requiredFixture(plan[0], 'plan de la frise').getBoundingClientRect();
      pointages.forEach(pointage => {
        markerOf(pointage).should(repere => {
          const centre = centreDe(requiredFixture(repere[0], 'repère'));
          expect(centre - left).to.be.at.least(MARGE_DES_REPERES_PX - 1);
          expect(right - centre).to.be.at.least(MARGE_DES_REPERES_PX - 1);
        });
      });
    });
  };

  const thenTheLatePointageStandsOnTheFrise = (): void => {
    cy.get(dataSelector('anomalie-frise')).then(frise => {
      const { left, right } = requiredFixture(frise[0], 'frise').getBoundingClientRect();
      markerOf(finTardiveFixture).should(repere => {
        const rect = requiredFixture(repere[0], 'repère tardif').getBoundingClientRect();
        expect(rect.left).to.be.at.least(left);
        expect(rect.right).to.be.at.most(right);
      });
    });
  };
});
