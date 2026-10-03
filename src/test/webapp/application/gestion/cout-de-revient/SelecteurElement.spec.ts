import { dataSelector } from '../../../utils/DataSelector';
import { AtelierApiFixture } from '../../../utils/gestion/atelier/AtelierApiFixture';
import {
  coutDeRevientFixture,
  rapportAutomatiqueFixture,
  rapportVideFixture,
} from '../../../utils/gestion/cout-de-revient/CoutDeRevientApiFixture';

describe('Navigation between cost reports', () => {
  beforeEach(() => {
    cy.intercept({ method: 'GET', pathname: '/api/elements-de-fabrication/*' }, request => {
      request.reply({ id: request.url.slice(request.url.lastIndexOf('/') + 1) });
    });
  });

  it('should navigate directly from an OF report to a mould report with its own received cost', () => {
    givenTwoDistinctReports();
    whenVisitingTheFirstReport();

    whenChoosingTheMould();

    thenTheMouldReportIsAddressedAndDisplayed();
  });

  it('should close the previous operation detail when the next report uses the same nature', () => {
    givenTwoDistinctReports();
    whenVisitingTheFirstReport();
    whenOpeningTheReportDetail();

    whenChoosingTheMould();

    thenTheNextReportHasNoOpenDetail();
  });

  it('should reread the historical element and close the previous choice and detail', () => {
    givenTwoDistinctReports();
    whenVisitingTheFirstReport();
    whenChoosingTheMould();

    whenGoingBackWithThePanelAndDetailOpen();

    thenTheFirstReportIsFreshAndItsTransientStateIsClosed();
  });

  it('should reread the next historical element and close the previous choice and detail on Forward', () => {
    givenTwoDistinctReports();
    whenVisitingTheFirstReport();
    whenChoosingTheMould();
    whenGoingBackWithThePanelAndDetailOpen();

    whenGoingForwardWithThePanelAndDetailOpen();

    thenTheMouldIsRereadWithoutPreviousTransientState();
  });

  const whenGoingForwardWithThePanelAndDetailOpen = (): void => {
    cy.location('pathname').should('equal', '/couts-de-revient/element-1');
    cy.get(dataSelector('cout-total')).should('contain.text', '700,00');
    whenOpeningTheReportDetail();
    cy.get(dataSelector('cout-element-trigger')).click();
    cy.get(dataSelector('cout-element-search')).type('OF');
    cy.go('forward');
  };
  const thenTheMouldIsRereadWithoutPreviousTransientState = (): void => {
    cy.location('pathname').should('equal', '/couts-de-revient/element-2');
    cy.get(dataSelector('cout-identite')).should('contain.text', 'Moule Beta');
    cy.get(dataSelector('cout-total')).should('contain.text', '620,00');
    cy.get(dataSelector('cout-evaluation')).should('contain.text', '15 mai 2026');
    cy.get(dataSelector('cout-element-panel')).should('not.exist');
    cy.get(dataSelector('cout-detail')).should('not.exist');
    cy.get('@elementsRead.all').should('have.length', 1);
    cy.get('@reportRead.all').should('have.length', 4);
  };

  const whenGoingBackWithThePanelAndDetailOpen = (): void => {
    cy.get(dataSelector('cout-identite')).should('contain.text', 'Moule Beta');
    whenOpeningTheReportDetail();
    cy.get(dataSelector('cout-element-trigger')).click();
    cy.get(dataSelector('cout-element-search')).type('moule');
    cy.go('back');
  };
  const thenTheFirstReportIsFreshAndItsTransientStateIsClosed = (): void => {
    cy.location('pathname').should('equal', '/couts-de-revient/element-1');
    cy.get(dataSelector('cout-total')).should('contain.text', '700,00');
    cy.get(dataSelector('cout-evaluation')).should('contain.text', '14 mai 2026');
    cy.get(dataSelector('cout-element-panel')).should('not.exist');
    cy.get(dataSelector('cout-detail')).should('not.exist');
    cy.get('@elementsRead.all').should('have.length', 1);
    cy.get('@reportRead.all').should('have.length', 3);
  };

  it('should retain the addressed report and detail when browser history rejects a real navigation', () => {
    givenTwoDistinctReports();
    whenVisitingTheFirstReport();
    whenOpeningTheReportDetail();
    givenTheNextHistoryWriteFails();

    whenChoosingTheMould();

    thenTheFailedNavigationKeepsTheFirstReport();
  });

  const givenTheNextHistoryWriteFails = (): void => {
    cy.window().then(win => {
      const pushState = win.history.pushState.bind(win.history);
      win.history.pushState = (...args: Parameters<History['pushState']>): void => {
        win.history.pushState = pushState;
        throw new Error(`History fixture failure for ${String(args[2])}`);
      };
    });
  };
  const thenTheFailedNavigationKeepsTheFirstReport = (): void => {
    cy.get(dataSelector('cout-navigation-error')).should('contain.text', 'Impossible d’ouvrir ce rapport');
    cy.location('pathname').should('equal', '/couts-de-revient/element-1');
    cy.get(dataSelector('cout-identite')).should('contain.text', 'OF-2026-000001');
    cy.get(dataSelector('cout-total')).should('contain.text', '295,00');
    cy.get(dataSelector('cout-detail')).should('be.visible');
    cy.get('@reportRead.all').should('have.length', 1);
  };

  it('should let a newer choice replace an unfinished navigation before its report is requested', () => {
    givenTwoDistinctReports();
    givenAThirdAvailableReport();
    whenVisitingTheFirstReport();

    whenChoosingTwoElementsInTheSameBrowserTurn();

    thenOnlyTheLatestChoiceBecomesAConsultation();
  });

  const givenAThirdAvailableReport = (): void => {
    cy.intercept('GET', '/api/elements-de-fabrication*', {
      body: {
        content: [
          { id: 'element-1', nom: 'OF Alpha', type: 'ORDRE_DE_FABRICATION' },
          { id: 'element-2', nom: 'Ébauche', type: 'PRODUIT' },
          { id: 'element-3', nom: 'OF Gamma', type: 'ORDRE_DE_FABRICATION' },
        ],
        currentPage: 0,
        pageSize: 100,
        totalElementsCount: 3,
      },
    });
    cy.intercept('GET', '/api/couts-de-revient/element-3', {
      body: { ...coutDeRevientFixture(), element: { id: 'element-3', nom: 'OF Gamma', type: 'ORDRE_DE_FABRICATION' } },
    }).as('thirdReportRead');
  };
  const whenChoosingTwoElementsInTheSameBrowserTurn = (): void => {
    cy.get(dataSelector('cout-element-trigger')).click();
    cy.get(dataSelector('cout-element-option')).then(options => {
      const first = requiredChoiceFixture(options, 'element-2');
      const latest = requiredChoiceFixture(options, 'element-3');
      first.click();
      latest.click();
    });
  };
  const requiredChoiceFixture = (options: JQuery<HTMLElement>, id: string): HTMLElement => {
    const choice = [...options].find(option => option.dataset['element'] === id);
    if (choice === undefined) {
      throw new Error('Navigation fixture choice is missing');
    }
    return choice;
  };
  const thenOnlyTheLatestChoiceBecomesAConsultation = (): void => {
    cy.location('pathname').should('equal', '/couts-de-revient/element-3');
    cy.get(dataSelector('cout-identite')).should('contain.text', 'OF Gamma');
    cy.get('@reportRead.all').should('have.length', 1);
    cy.get('@thirdReportRead.all').should('have.length', 1);
    cy.get(dataSelector('cout-navigation-error')).should('not.exist');
    cy.get(dataSelector('cout-element-panel')).should('not.exist');
  };

  it('should ignore a late old report after the next addressed report is displayed', () => {
    givenTwoDistinctReports();
    const pending = givenAPendingFirstReport();
    whenVisitingThePendingFirstReport();

    whenChoosingTheMouldAndReleasingTheOldReport(pending);

    thenTheLateReportDidNotReplaceTheMould();
  });

  const thenTheLateReportDidNotReplaceTheMould = (): void => {
    cy.location('pathname').should('equal', '/couts-de-revient/element-2');
    cy.get(dataSelector('cout-identite')).should('contain.text', 'Moule Beta');
    cy.get(dataSelector('cout-total')).should('contain.text', '520,00');
    cy.get(dataSelector('cout-evaluation')).should('contain.text', '12 mai 2026');
    cy.get(dataSelector('cout-temps-total')).should('contain.text', '13 h');
    cy.get(dataSelector('cout-ligne-row')).should('have.length', 1);
    cy.get(dataSelector('cout-travail-cell')).should('contain.text', '13 h');
    cy.get(dataSelector('cout-nature-anomalie')).should('have.attr', 'data-anomalie', 'FIN_AUTOMATIQUE').and('be.visible');
    cy.get(dataSelector('cout-pointage-anomalie')).should('have.attr', 'data-anomalie', 'FIN_AUTOMATIQUE').and('be.visible');
    cy.get(dataSelector('cout-pointage-operateur')).should('contain.text', 'Alice Moule');
    cy.get(dataSelector('cout-activites-exclues')).should('contain.text', '2');
    cy.get(dataSelector('cout-temps-non-conformite')).should('not.exist');
    cy.get(dataSelector('cout-error')).should('not.exist');
  };

  const givenAPendingFirstReport = (): { readonly arrived: Promise<void>; send: () => void } => {
    let arrive = (): void => {};
    let send = (): void => {};
    const arrived = new Promise<void>(resolve => {
      arrive = resolve;
    });
    const release = new Promise<void>(resolve => {
      send = resolve;
    });
    cy.intercept('GET', '/api/couts-de-revient/element-1', request => {
      arrive();
      return release.then(() => {
        request.reply({ body: coutDeRevientFixture() });
      });
    }).as('oldReportRead');
    return { arrived, send };
  };
  const whenVisitingThePendingFirstReport = (): void => {
    cy.visit('/couts-de-revient/element-1');
    cy.get(dataSelector('cout-loading')).should('be.visible');
  };
  const whenChoosingTheMouldAndReleasingTheOldReport = (pending: { readonly arrived: Promise<void>; send: () => void }): void => {
    cy.wrap(pending.arrived);
    whenChoosingTheMould();
    cy.get(dataSelector('cout-total')).should('contain.text', '520,00');
    cy.then(() => {
      pending.send();
    });
    cy.wait('@oldReportRead');
    whenOpeningTheReportDetail();
  };

  it('should make an element beyond the first hundred identities available for navigation', () => {
    givenTwoDistinctReports();
    givenACollectionWithTwoPages();
    whenVisitingTheFirstReport();

    whenChoosingTheMould();

    thenTheLaterPageElementIsDisplayed();
  });

  const givenACollectionWithTwoPages = (): void => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: index === 0 ? 'element-1' : `filler-${String(index)}`,
      nom: `OF ${String(index)}`,
      type: 'ORDRE_DE_FABRICATION',
    }));
    cy.intercept('GET', '/api/elements-de-fabrication*', request => {
      request.reply({
        content: Number(request.query['page']) === 0 ? firstPage : [{ id: 'element-2', nom: 'Ébauche', type: 'PRODUIT' }],
        currentPage: Number(request.query['page']),
        pageSize: 100,
        totalElementsCount: 101,
      });
    }).as('pagedElementsRead');
  };
  const thenTheLaterPageElementIsDisplayed = (): void => {
    cy.location('pathname').should('equal', '/couts-de-revient/element-2');
    cy.get(dataSelector('cout-total')).should('contain.text', '520,00');
    cy.get('@pagedElementsRead.all').should('have.length', 2);
  };

  it('should allow a new choice after the browser restores a rejected navigation', () => {
    givenTwoDistinctReports();
    whenVisitingTheFirstReport();
    whenOpeningTheReportDetail();
    givenTheNextHistoryWriteFails();
    whenChoosingTheMould();

    whenRetryingTheRejectedChoice();

    thenTheMouldReportIsAddressedAndDisplayed();
  });

  it('should reload both the addressed report and collection on a browser reload', () => {
    givenTwoDistinctReports();
    whenVisitingTheFirstReport();

    whenReloadingThePage();

    thenTheNewMountReloadedTheReference();
  });

  it('should reload the collection after leaving the report and returning through history', () => {
    givenTwoDistinctReports();
    givenAnAvailableWorkshop();
    whenVisitingTheFirstReport();

    whenLeavingAndReturningToTheReport();

    thenTheNewMountReloadedTheReference();
  });

  it('should display a directly addressed report absent from the choice collection', () => {
    givenTwoDistinctReports();
    givenAnUnlistedReport();

    whenVisitingTheUnlistedReportAndChoosingTheMould();

    thenTheMouldReportIsDisplayedAfterTheUnlistedConsultation();
  });

  it('should let a removed choice lead to the missing report state and another choice', () => {
    givenTwoDistinctReports();
    givenADeletedMould();
    whenVisitingTheFirstReport();

    whenChoosingTheDeletedMouldAndReturningToTheOF();

    thenTheOFIsFreshAfterTheMissingReport();
  });

  it('should let an element without clocking be chosen and explain its complete zero report', () => {
    givenTwoDistinctReports();
    givenAMouldWithoutWork();
    whenVisitingTheFirstReport();

    whenChoosingTheMould();

    thenTheReportWithoutWorkIsExplained();
  });

  const givenAnAvailableWorkshop = (): void => {
    new AtelierApiFixture().install();
  };
  const givenAnUnlistedReport = (): void => {
    cy.intercept('GET', '/api/couts-de-revient/inconnu', {
      body: { ...coutDeRevientFixture(), element: { id: 'inconnu', nom: 'OF Hors liste', type: 'ORDRE_DE_FABRICATION' } },
    }).as('unlistedReportRead');
  };
  const givenADeletedMould = (): void => {
    cy.intercept('GET', '/api/couts-de-revient/element-2', { statusCode: 404, body: {} });
  };
  const givenAMouldWithoutWork = (): void => {
    cy.intercept('GET', '/api/couts-de-revient/element-2', {
      body: { ...rapportVideFixture(), element: { id: 'element-2', nom: 'Moule sans travail', type: 'PRODUIT' } },
    });
  };
  const whenRetryingTheRejectedChoice = (): void => {
    cy.get(dataSelector('cout-navigation-error')).should('be.visible');
    whenChoosingTheMould();
  };
  const whenReloadingThePage = (): void => {
    cy.get(dataSelector('cout-element-trigger')).should('be.enabled');
    cy.reload();
  };
  const whenLeavingAndReturningToTheReport = (): void => {
    cy.get(dataSelector('cout-element-trigger')).should('be.enabled');
    cy.get(dataSelector('cout-retour')).click();
    cy.location('pathname').should('equal', '/atelier');
    cy.go('back');
  };
  const whenVisitingTheUnlistedReportAndChoosingTheMould = (): void => {
    cy.visit('/couts-de-revient/inconnu');
    cy.wait('@unlistedReportRead');
    cy.get(dataSelector('cout-total')).should('contain.text', '295,00');
    cy.get(dataSelector('cout-identite')).invoke('text').as('unlistedIdentity', { type: 'static' });
    whenChoosingTheMould();
  };
  const whenChoosingTheDeletedMouldAndReturningToTheOF = (): void => {
    whenChoosingTheMould();
    cy.get(dataSelector('cout-element-introuvable')).invoke('text').as('missingReport', { type: 'static' });
    cy.get(dataSelector('cout-element-trigger')).click();
    cy.get(dataSelector('cout-element-option')).filter('[data-element="element-1"]').click();
  };
  const thenTheNewMountReloadedTheReference = (): void => {
    cy.get(dataSelector('cout-total')).should('contain.text', '700,00');
    cy.get('@elementsRead.all').should('have.length', 2);
    cy.get('@reportRead.all').should('have.length', 2);
  };
  const thenTheMouldReportIsDisplayedAfterTheUnlistedConsultation = (): void => {
    cy.get('@unlistedIdentity').should('contain', 'OF Hors liste');
    cy.get(dataSelector('cout-identite')).should('contain.text', 'Moule Beta');
    cy.location('pathname').should('equal', '/couts-de-revient/element-2');
    cy.get('@elementsRead.all').should('have.length', 1);
  };
  const thenTheOFIsFreshAfterTheMissingReport = (): void => {
    cy.get('@missingReport').should('contain', 'n’existe plus');
    cy.location('pathname').should('equal', '/couts-de-revient/element-1');
    cy.get(dataSelector('cout-total')).should('contain.text', '700,00');
    cy.get('@elementsRead.all').should('have.length', 1);
  };
  const thenTheReportWithoutWorkIsExplained = (): void => {
    cy.location('pathname').should('equal', '/couts-de-revient/element-2');
    cy.get(dataSelector('cout-sans-travail')).should('contain.text', 'Aucun temps pointé');
    cy.get(dataSelector('cout-total')).should('contain.text', '0,00');
    cy.get(dataSelector('cout-ligne-row')).should('not.exist');
  };

  const whenOpeningTheReportDetail = (): void => {
    cy.get(dataSelector('cout-detail-toggle')).first().click();
  };
  const thenTheNextReportHasNoOpenDetail = (): void => {
    cy.get(dataSelector('cout-total')).should('contain.text', '520,00');
    cy.get(dataSelector('cout-nature-cell')).should('have.length', 1).and('contain.text', 'Fraisage');
    cy.get(dataSelector('cout-detail')).should('not.exist');
  };

  const givenTwoDistinctReports = (): void => {
    let firstElementReads = 0;
    let mouldReads = 0;
    cy.intercept('GET', '/api/elements-de-fabrication*', {
      body: {
        content: [
          { id: 'element-1', nom: 'OF Alpha', type: 'ORDRE_DE_FABRICATION' },
          { id: 'element-2', nom: 'Ébauche', type: 'PRODUIT' },
        ],
        currentPage: 0,
        pageSize: 100,
        totalElementsCount: 2,
      },
    }).as('elementsRead');
    cy.intercept('GET', '/api/couts-de-revient/*', request => {
      const rapport = coutDeRevientFixture();
      if (request.url.endsWith('/element-2')) {
        mouldReads += 1;
        request.reply({
          ...mouldReportFixture(),
          element: { id: 'element-2', nom: 'Moule Beta', type: 'PRODUIT' },
          ...mouldEvaluationFixture(mouldReads),
          activitesEnCours: 2,
        });
      } else {
        firstElementReads += 1;
        request.reply(
          firstElementReads === 1
            ? rapport
            : {
                ...rapport,
                evaluation: '2026-05-14T12:00:00Z',
                cout: {
                  machine: { complete: true, valeur: 600 },
                  mainDOeuvre: { complete: true, valeur: 100 },
                  total: { complete: true, valeur: 700 },
                },
              },
        );
      }
    }).as('reportRead');
  };
  const mouldReportFixture = (): ReturnType<typeof coutDeRevientFixture> => {
    const rapport = rapportAutomatiqueFixture();
    if (rapport.lignes === undefined) {
      throw new Error('Mould fixture must contain its cost lines');
    }
    return {
      ...rapport,
      lignes: rapport.lignes.map(ligne => ({
        ...ligne,
        pointages: ligne.pointages.map(pointage => ({ ...pointage, operateur: { id: 'operateur-moule', prenom: 'Alice', nom: 'Moule' } })),
      })),
    };
  };
  const mouldEvaluationFixture = (reads: number): Pick<ReturnType<typeof coutDeRevientFixture>, 'evaluation' | 'cout'> => ({
    evaluation: reads === 1 ? '2026-05-12T12:00:00Z' : '2026-05-15T12:00:00Z',
    cout: {
      machine: { complete: true, valeur: reads === 1 ? 500 : 600 },
      mainDOeuvre: { complete: true, valeur: 20 },
      total: { complete: true, valeur: reads === 1 ? 520 : 620 },
    },
  });
  const whenVisitingTheFirstReport = (): void => {
    cy.visit('/couts-de-revient/element-1');
    cy.wait('@reportRead');
  };
  const whenChoosingTheMould = (): void => {
    cy.get(dataSelector('cout-element-trigger')).click();
    cy.get(dataSelector('cout-element-option')).filter('[data-element="element-2"]').click();
  };
  const thenTheMouldReportIsAddressedAndDisplayed = (): void => {
    cy.location('pathname').should('equal', '/couts-de-revient/element-2');
    cy.location('search').should('equal', '');
    cy.get(dataSelector('cout-identite')).invoke('text').invoke('trim').should('equal', 'Moule · Moule Beta');
    cy.get(dataSelector('cout-total')).should('contain.text', '520,00');
    cy.get(dataSelector('cout-evaluation')).should('contain.text', '12 mai 2026');
    cy.get(dataSelector('cout-element-panel')).should('not.exist');
    cy.get('@elementsRead.all').should('have.length', 1);
    cy.get('@reportRead.all').should('have.length', 2);
  };
});
