import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';
import { abscisseDeLHeure, abscisseDuDernierTrait, centreDe } from '../../../utils/gestion/anomalies-de-pointage/AbscisseSurLaFrise';
import {
  activiteFinAutomatiqueFixture,
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
import { instantLocalFixture } from '../../../utils/gestion/anomalies-de-pointage/InstantLocal.fixture';
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

  it('should stand the handle on the hour of the proposed end', () => {
    whenOpeningTheLateEndCorrection();

    thenTheHandleStandsOnTheHour(23);
  });

  it('should hold the handle on the last graduation when End carries it three hours after the last received instant', () => {
    whenOpeningTheLateEndCorrection();
    whenPressingEndOnTheHandle();

    thenTheTimeFieldShows(new Date(2026, 8, 15, 2, 0));
    thenTheHandleStandsOnTheLastGraduation();
  });

  it('should stand the markers and the bar after the act under the ones above that hold the same instants', () => {
    givenAPreviewOfTheLateEndCorrection();

    whenOpeningTheLateEndCorrection();
    whenPreviewingTheCorrection();

    thenTheStateAfterTheActStandsUnderTheOneAbove();
  });

  const whenPressingEndOnTheHandle = (): void => {
    cy.get(dataSelector('anomalie-poignee')).focus();
    cy.get(dataSelector('anomalie-poignee')).trigger('keydown', { key: 'End' });
  };

  const thenTheHandleStandsOnTheHour = (hour: number): void => {
    abscisseDeLHeure(hour).then(abscisse => {
      cy.get(dataSelector('anomalie-poignee')).should(poignee => {
        expect(centreDe(requiredFixture(poignee[0], 'poignée'))).to.be.closeTo(abscisse, 1);
      });
    });
  };

  const thenTheHandleStandsOnTheLastGraduation = (): void => {
    abscisseDuDernierTrait().then(abscisse => {
      cy.get(dataSelector('anomalie-poignee')).should(poignee => {
        expect(centreDe(requiredFixture(poignee[0], 'poignée'))).to.be.closeTo(abscisse, 1);
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

  const whenDraggingTheHandleTo = (hour: number): void => {
    abscisseDeLHeure(hour).then(clientX => {
      cy.get(dataSelector('anomalie-poignee')).trigger('pointerdown', { pointerId: 1, buttons: 1 });
      cy.get(dataSelector('anomalie-poignee')).trigger('pointermove', { pointerId: 1, buttons: 1, clientX });
      cy.get(dataSelector('anomalie-poignee')).trigger('pointerup', { pointerId: 1, clientX });
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
      const { left } = requiredFixture(rangee[0], 'rangée de placement').getBoundingClientRect();
      abscisseDeLHeure(hour).then(clientX => {
        cy.get(dataSelector('anomalie-frise-placement')).click(clientX - left, 20);
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

    whenOpeningTheFrise();

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

  const plan = () => cy.get(dataSelector('anomalie-frise-plan'));

  const barre = () =>
    cy
      .get(dataSelector('anomalie-frise'))
      .find(dataSelector('anomalie-activite'))
      .filter(`[data-activite="${activiteFinAutomatiqueFixture}"]`);

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
      abscisseDuDernierTrait().should(abscisse => {
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
