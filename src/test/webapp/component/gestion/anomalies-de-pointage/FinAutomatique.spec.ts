import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';
import { abscisseDeLHeure, centreDe } from '../../../utils/gestion/anomalies-de-pointage/AbscisseSurLaFrise';
import {
  activiteFinAutomatiqueFixture,
  apercuFixture,
  confirmationFinAutomatiqueFixture,
  dossierApresRegularisationFixture,
  dossierDeuxFinsAutomatiquesFixture,
  dossierFinAutomatiqueFixture,
  dossierFinAutomatiqueSuivieLeLendemainFixture,
  echeanceFinAutomatiqueLocalFixture,
  finRegulariseeFixture,
  givenTheReferentielFinAutomatique,
  instantRegulariseLocalFixture,
  operateurFinAutomatiqueFixture,
  ouvrantFinAutomatiqueFixture,
  ouvrantSuivantFixture,
  suiviFinAutomatiqueFixture,
} from '../../../utils/gestion/anomalies-de-pointage/FinAutomatiqueHttp.fixture';
import { instantLocalFixture } from '../../../utils/gestion/anomalies-de-pointage/InstantLocal.fixture';
import {
  thenTheHandleHolds,
  thenTheHandleHoldsNoHour,
  whenPlacingTheHourWithTheHandleAt,
} from '../../../utils/gestion/anomalies-de-pointage/PoigneeDeLaFrise';
import { markerOf } from '../../../utils/gestion/anomalies-de-pointage/RepereDeLaFrise';

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
    it(`should keep the automatic end and the handle that places its hour reachable at ${width} pixels`, () => {
      whenOpeningTheAutomaticEndAt(width);
      whenReachingTheHandle();

      thenTheHandleIsReachableWithoutHorizontalOverflow();
    });
  });

  const whenOpeningTheAutomaticEndAt = (width: number): void => {
    cy.viewport(width, 900);
    cy.visit(`/anomalies/${suiviFinAutomatiqueFixture}?pointage=${ouvrantFinAutomatiqueFixture}`);
    cy.get(dataSelector('anomalie-probleme')).should('be.visible');
  };

  const whenReachingTheHandle = (): void => {
    cy.get(dataSelector('anomalie-poignee')).scrollIntoView();
  };

  const thenTheHandleIsReachableWithoutHorizontalOverflow = (): void => {
    cy.get(dataSelector('anomalie-poignee')).should('be.visible').and('have.attr', 'data-sans-heure');
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

  it('should show the problem, the frise with its hourless handle and the validation', () => {
    givenTheDossier(dossierFinAutomatiqueFixture());

    whenOpeningTheResolutionView();

    thenOnlyTheResolutionViewIsDrawn();
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

  it('should say the outcome in one line and keep its detail folded, without any reason', () => {
    givenTheDossier(dossierFinAutomatiqueFixture());
    givenAPreviewOfTheRegularisation();
    whenOpeningTheResolutionView();

    whenPlacingTheEnd();

    thenTheOutcomeIsInOneLineWithAFoldedDetail();
  });

  it('should not offer the next anomaly while the end is not validated', () => {
    givenTheDossier(dossierFinAutomatiqueFixture());
    givenAPreviewOfTheRegularisation();
    whenOpeningTheResolutionView();

    whenPlacingTheEnd();

    thenTheNextAnomalyIsNotOffered();
  });

  it('should offer the next anomaly with the receipt once the end is validated', () => {
    givenTheDossier(dossierFinAutomatiqueFixture());
    givenAPreviewOfTheRegularisation();
    givenAConfirmationOf(dossierApresRegularisationFixture());
    whenOpeningTheResolutionView();

    whenPlacingTheEnd();
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

  const whenOpeningTheResolutionViewFromTheList = (): void => {
    cy.viewport(1280, 900);
    cy.visit(
      `/anomalies/${suiviFinAutomatiqueFixture}?nature=FIN_AUTOMATIQUE&operateur=${operateurFinAutomatiqueFixture}&page=2&pointage=${ouvrantFinAutomatiqueFixture}`,
    );
  };

  const whenPlacingTheEnd = (): void => {
    whenPlacingTheHourWithTheHandleAt(instantRegulariseLocalFixture);
  };

  const thenOnlyTheResolutionViewIsDrawn = (): void => {
    cy.get(dataSelector('anomalie-probleme')).should('be.visible');
    cy.get(dataSelector('anomalie-frise')).should('be.visible');
    thenTheHandleHoldsNoHour();
    cy.get(dataSelector('anomalie-resolution-valider')).should('be.disabled');
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

  const thenTheOutcomeIsInOneLineWithAFoldedDetail = (): void => {
    cy.get(dataSelector('anomalie-resolution-apercu')).should('have.text', 'Travail 13 h → 9 h · anomalie traitée');
    cy.get(dataSelector('anomalie-resolution-detail')).should('not.have.attr', 'open');
    cy.get(dataSelector('anomalie-resolution-valider')).should('be.enabled').and('contain.text', 'Valider la fin à 17:00');
  };
});

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

  it('should offer no field to type the hour and place it at the automatic end at the first key on the hourless handle', () => {
    whenOpeningTheAutomaticEndRegularisation();
    whenPressingAnArrowOnTheHourlessHandle();

    thenNoHourFieldIsOffered();
    thenTheEndIsPlacedAt(echeanceFinAutomatiqueLocalFixture);
    thenTheHandleKeepsTheFocus();
  });

  it('should draw the start marker as an image that selects nothing and places no end', () => {
    whenOpeningTheAutomaticEndRegularisation();

    thenTheStartMarkerIsAnImageThatCannotBePressed();
    thenTheHandleHoldsNoHour();
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

  const whenPressingAnArrowOnTheHourlessHandle = (): void => {
    cy.get(dataSelector('anomalie-poignee')).should('have.attr', 'data-sans-heure');
    cy.get(dataSelector('anomalie-poignee')).focus();
    cy.get(dataSelector('anomalie-poignee')).type('{leftArrow}');
  };

  const whenGoingOnDraggingTheHandleTo = (hour: number): void => {
    abscisseDeLHeure(hour).then(clientX => {
      cy.get(dataSelector('anomalie-poignee')).trigger('pointermove', { pointerId: 1, buttons: 1, clientX });
    });
  };

  const thenNoHourIsInventedAndTheEndCanBePlaced = (): void => {
    thenTheHandleHoldsNoHour();
    cy.get(dataSelector('anomalie-poignee'))
      .invoke('text')
      .should('match', /^\s*Heure \?\s*$/);
    cy.get(dataSelector('anomalie-resolution-valider')).should('be.disabled');
    cy.get(dataSelector('anomalie-frise-aide'))
      .should('be.visible')
      .and('contain.text', 'Tirez le bout de la barre ou cliquez dessus pour placer la fin réelle.');
  };

  const thenTheEndIsPlacedAt = (instant: Date): void => {
    thenTheHandleHolds(instant);
    cy.get(dataSelector('anomalie-poignee')).should('be.visible');
    cy.get(dataSelector('anomalie-frise-placement')).should('not.exist');
    cy.get(dataSelector('anomalie-frise-aide')).should('not.exist');
  };

  const thenNoHourFieldIsOffered = (): void => {
    cy.get(dataSelector('anomalie-resolution')).find('input').should('not.exist');
  };

  const thenTheHandleKeepsTheFocus = (): void => {
    cy.get(dataSelector('anomalie-poignee')).should('have.focus');
  };

  const thenTheStartMarkerIsAnImageThatCannotBePressed = (): void => {
    markerOf(ouvrantFinAutomatiqueFixture).should('have.attr', 'role', 'img');
  };
});

describe('Automatic end on the frise in Gestion', () => {
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

      thenTheHandleHolds(new Date(2026, 8, 14, hour, 0));
      thenTheBarEndsOnTheHour(hour);
      thenTheBarIsNamedWithTheProposedHour(`${hour}:00`);
    });
  });

  it('should move the hour placed by a click on the bar when its handle is then dragged earlier', () => {
    whenOpeningTheFriseAt(1280);
    whenPlacingTheEndAt(17);
    whenDraggingTheHandleTo(12);

    thenTheHandleHolds(new Date(2026, 8, 14, 12, 0));
    thenTheBarEndsOnTheHour(12);
    thenTheBarIsNamedWithTheProposedHour('12:00');
  });

  it('should keep the grab offset when the handle placed by a click is grabbed off-centre and dragged earlier', () => {
    whenOpeningTheFriseAt(1280);
    whenPlacingTheEndAt(17);
    whenDraggingTheHandleGrabbedOffCentreTo(12);

    thenTheHandleHolds(new Date(2026, 8, 14, 12, 0));
    thenTheBarEndsOnTheHour(12);
  });

  it('should move the hour placed with the keyboard when its handle is then dragged earlier', () => {
    whenOpeningTheFriseAt(1280);
    whenPlacingTheHourWithTheHandleAt(new Date(2026, 8, 14, 17, 0));
    whenDraggingTheHandleTo(12);

    thenTheHandleHolds(new Date(2026, 8, 14, 12, 0));
    thenTheBarEndsOnTheHour(12);
  });

  it('should hold the handle 22 pixels from the edge, on its bar, when End carries it to the last hour of the scale', () => {
    whenOpeningTheFriseAt(1280);
    whenPlacingTheEndAt(17);
    whenPressingEndOnTheHandle();

    thenTheHandleIsHeldOnItsBar();
  });

  it('should show the outcome of the preview once the end is placed on the frise', () => {
    whenOpeningTheFriseAt(1280);
    whenPlacingTheEndAt(17);
    whenWaitingForThePreviewOfTheEnd();
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
    whenPlacingTheHourWithTheHandleAt(instantRegulariseLocalFixture);
    cy.get(dataSelector('anomalie-resolution-valider')).should('be.enabled').click();
    cy.get(dataSelector('anomalie-resultat')).should('be.visible');
    markerOf(finRegulariseeFixture).should('exist');
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

describe('Geometry of the frise in Gestion', () => {
  const suiviUrl = `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`;

  beforeEach(() => {
    cy.clock(new Date(2026, 8, 15, 10, 0).getTime(), ['Date']);
    givenTheReferentielFinAutomatique();
  });

  it('should stretch the graduations from the left edge to the right edge of the frise', () => {
    givenTheDossier(dossierFinAutomatiqueFixture());

    whenOpeningTheFrise();

    thenTheGraduationsSpanThePlan();
  });

  it('should stop the bar of an expired activity at its automatic end, short of the edge of the frise', () => {
    givenTheDossier(dossierFinAutomatiqueFixture());

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

  const givenTheDossier = (dossier: components['schemas']['RestDossierAnomalie']): void => {
    cy.intercept('GET', suiviUrl, { body: dossier });
  };

  const withTheActivity = (
    changement: Partial<components['schemas']['RestActiviteDuDossier']>,
  ): components['schemas']['RestDossierAnomalie'] => {
    const dossier = dossierFinAutomatiqueFixture();
    return {
      ...dossier,
      activites: dossier.activites.map(activite => ({ ...activite, ...changement })),
    };
  };

  const whenOpeningTheFrise = (): void => {
    cy.viewport(1280, 900);
    cy.visit(`/anomalies/${suiviFinAutomatiqueFixture}?pointage=${ouvrantFinAutomatiqueFixture}`);
    cy.get(dataSelector('anomalie-frise')).should('be.visible');
  };

  const plan = () => cy.get(dataSelector('anomalie-frise-plan'));

  const barre = barreDeLActivite;

  const thenTheGraduationsSpanThePlan = (): void => {
    plan().then(element => {
      const { left, right } = requiredFixture(element[0], 'plan de la frise').getBoundingClientRect();
      cy.get(dataSelector('anomalie-frise-graduation')).should(graduations => {
        const premiere = requiredFixture(graduations[0], 'première graduation');
        const derniere = requiredFixture(graduations[graduations.length - 1], 'dernière graduation');
        expect(premiere.getBoundingClientRect().left).to.be.closeTo(left, 1);
        expect(derniere.getBoundingClientRect().left).to.be.closeTo(right, 1);
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
});

describe('Frise of a dossier spanning 26 hours in Gestion', () => {
  const suiviUrl = `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`;

  beforeEach(() => {
    cy.clock(new Date(2026, 8, 15, 12, 0).getTime(), ['Date']);
    givenTheReferentielFinAutomatique();
    cy.intercept('GET', suiviUrl, { body: dossierFinAutomatiqueSuivieLeLendemainFixture() });
  });

  [1280, 768, 390].forEach(width => {
    it(`should fit the page and the frise in ${width} pixels`, () => {
      whenOpeningTheFriseAt(width);

      thenNeitherThePageNorTheFriseOverflows();
    });
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
});
