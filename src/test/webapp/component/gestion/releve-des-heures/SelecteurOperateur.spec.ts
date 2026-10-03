import { dataSelector } from '../../../utils/DataSelector';
import { OperateursDuReleveApiFixture } from '../../../utils/gestion/releve-des-heures/OperateursDuReleveApiFixture';
import {
  feuilleFixture,
  SyntheseDesHeuresApiFixture,
  syntheseFixture,
} from '../../../utils/gestion/releve-des-heures/SyntheseDesHeuresApiFixture';

const ADRESSE = '/operateurs/op-1/heures?annee=2026&semaine=38&jour=2026-09-14';
const HORLOGE = new Date(2026, 8, 17, 10).getTime();

describe('Operator selector in the operational time header', () => {
  let rapports: SyntheseDesHeuresApiFixture;
  let liste: OperateursDuReleveApiFixture;
  let releaseList = (): void => {};
  let releaseReport = (): void => {};
  beforeEach(() => {
    rapports = new SyntheseDesHeuresApiFixture();
    liste = new OperateursDuReleveApiFixture();
    releaseReport = () => {};
    releaseList = () => {};
  });
  afterEach(() => {
    releaseReport();
    releaseList();
  });
  it('should display the consulted operator before the period controls', () => {
    givenAvailableReports();

    whenVisitingTheReport();

    thenTheConsultedOperatorIsAvailableInTheHeader();
  });

  it('should open an anchored search panel and focus its search field', () => {
    givenAvailableReports();
    whenVisitingTheReport();

    whenOpeningTheSelector();

    thenTheSearchIsFocusedAndAllOperatorsAreAvailable();
  });

  it('should present operators alphabetically by surname then first name', () => {
    givenAvailableReports();
    whenVisitingTheReport();

    whenOpeningTheSelector();

    thenTheChoicesAre(['Jean DUPONT', 'Alice ÉVRARD', 'Zoé ÉVRARD']);
  });

  it('should search names without case, accents or surrounding spaces without rereading hours', () => {
    givenAvailableReports();
    whenVisitingTheReport();
    whenOpeningTheSelector();

    whenSearching('  zOE  ');

    thenTheChoicesAre(['Zoé ÉVRARD']);
    thenTheConsultationHasNotChanged();
  });

  it('should explain an unmatched search without changing the consultation', () => {
    givenAvailableReports();
    whenVisitingTheReport();
    whenOpeningTheSelector();

    whenSearching('inconnu');

    thenNoOperatorMatchesTheSearch();
    thenTheConsultationHasNotChanged();
  });

  it('should identify the consulted operator with an accessible textual indication', () => {
    givenAvailableReports();
    whenVisitingTheReport();

    whenOpeningTheSelector();

    thenTheCurrentOperatorIsIdentified();
  });

  it('should close with Escape from the search and restore focus without changing the consultation', () => {
    givenAvailableReports();
    whenVisitingTheReport();
    whenOpeningTheSelector();

    whenEscapingFromSearch();

    thenThePanelIsClosedAndTheTriggerFocused();
    thenTheConsultationHasNotChanged();
  });

  it('should close on an outside click and leave focus on its target', () => {
    givenAvailableReports();
    whenVisitingTheReport();
    whenOpeningTheSelector();

    whenClickingThePeriodControlOutsideThePanel();

    thenThePanelIsClosedAndThePeriodControlFocused();
  });

  it('should close when choosing the consulted operator without acquiring its report again', () => {
    givenAvailableReports();
    whenVisitingTheReport();
    whenOpeningTheSelector();

    whenChoosingTheCurrentOperator();

    thenThePanelIsClosedAndTheTriggerFocused();
    thenTheConsultationHasNotChanged();
  });

  it('should start each new opening with an empty search and the current operator identifiable', () => {
    givenAvailableReports();
    whenVisitingTheReport();
    whenOpeningTheSelector();
    whenSearching('zoe');
    whenEscapingFromSearch();

    whenOpeningTheSelector();

    thenTheSearchIsEmpty();
    thenTheCurrentOperatorIsIdentified();
  });

  it('should name the pending consultation from the acquired operator list while its report loads', () => {
    givenPendingReport();
    givenAvailableReports();

    whenVisitingTheReport();

    thenThePendingConsultationIsIdentified();
  });

  it('should keep hours readable and disable choices locally while the operator list loads', () => {
    givenPendingOperatorList();
    givenAvailableReports();

    whenVisitingTheReport();

    thenTheListLoadsIndependentlyOfHours();
  });

  it('should show a local operator-list failure while the report remains readable', () => {
    liste.failRead = true;
    givenAvailableReports();

    whenVisitingTheReport();

    thenTheOperatorListFailureLeavesHoursReadable();
  });

  it('should explain that an acquired empty collection offers no operator choice', () => {
    liste = new OperateursDuReleveApiFixture([]);
    givenAvailableReports();

    whenVisitingTheReport();

    thenNoOperatorIsAvailableForChoice();
  });

  it('should give a long operator name the full control width and put period controls on the next mobile row', () => {
    givenLongOperatorName();
    givenAvailableReports();

    whenVisitingTheReportAt(320);

    thenTheMobileControlKeepsTheFullAccessibleName();
  });

  it('should also give a short operator name the full width on mobile', () => {
    givenAvailableReports();

    whenVisitingTheReportAt(320);

    thenTheMobileControlUsesTheFullWidth();
  });

  const thenTheMobileControlUsesTheFullWidth = (): void => {
    cy.get(dataSelector('selecteur-operateur')).should(control => {
      expect(requiredFixture(control[0]).getBoundingClientRect().width).to.equal(288);
    });
  };

  it('should retry a failed list acquisition without rereading the operational report', () => {
    liste.failRead = true;
    givenAvailableReports();
    whenVisitingTheReport();

    whenRetryingTheOperatorList();

    thenTheOperatorChoiceIsAvailableAgain();
    thenTheConsultationHasNotChanged();
  });

  it('should leave operator choice available when the operational report fails', () => {
    rapports.failRead = true;
    givenAvailableReports();
    whenVisitingTheReport();

    whenOpeningTheSelector();

    thenTheFailedReportLeavesAllOperatorChoicesAvailable();
  });

  it('should close with Escape from an operator proposal and restore the trigger focus', () => {
    givenAvailableReports();
    whenVisitingTheReport();
    whenOpeningTheSelector();

    whenEscapingFromAProposal();

    thenThePanelIsClosedAndTheTriggerFocused();
  });

  it('should support a keyboard choice and return focus without trapping Tab', () => {
    givenAvailableReports();
    whenVisitingTheReport();
    whenOpeningTheSelector();

    whenChoosingTheCurrentOperatorWithTheKeyboard();

    thenThePanelIsClosedAndTheTriggerFocused();
    thenTheConsultationHasNotChanged();
  });

  it('should allow reverse keyboard traversal from a proposal back to the search', () => {
    givenAvailableReports();
    whenVisitingTheReport();
    whenOpeningTheSelector();

    whenTabbingForwardThenBackToSearch();

    thenTheSearchIsFocusedAndAllOperatorsAreAvailable();
    thenTheConsultationHasNotChanged();
  });

  const whenTabbingForwardThenBackToSearch = (): void => {
    cy.get(dataSelector('selecteur-operateur-recherche')).should('be.focused');
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.get(dataSelector('selecteur-operateur-proposition')).first().should('be.focused');
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Input.dispatchKeyEvent',
        params: { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 },
      }).then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Input.dispatchKeyEvent',
          params: { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 },
        }),
      ),
    );
  };

  for (const width of [320, 1024, 1280]) {
    it(`should keep the anchored panel inside the viewport and all targets touchable at ${String(width)} pixels`, () => {
      givenAvailableReports();
      whenVisitingTheReportAt(width);

      whenOpeningAndCapturingTheSelector(width);

      thenThePanelFitsTheViewportWithTouchableTargets(width);
    });
  }

  it('should reopen normally after Escape closes the overlay from a focused control outside it', () => {
    givenAvailableReports();
    whenVisitingTheReport();
    whenOpeningTheSelector();
    whenEscapingOutsideThePanel();

    whenOpeningTheSelector();

    thenTheSearchIsFocusedAndAllOperatorsAreAvailable();
  });

  const whenEscapingOutsideThePanel = (): void => {
    cy.get(dataSelector('synthese-semaine-precedente')).focus();
    cy.get(dataSelector('synthese-semaine-precedente')).type('{esc}');
    cy.get(dataSelector('selecteur-operateur-panneau')).should('not.exist');
  };

  const whenRetryingTheOperatorList = (): void => {
    cy.get(dataSelector('selecteur-operateur-erreur')).then(() => {
      liste.failRead = false;
    });
    cy.get(dataSelector('selecteur-operateur-reessayer')).click();
  };

  const thenTheOperatorChoiceIsAvailableAgain = (): void => {
    cy.get(dataSelector('selecteur-operateur')).should('be.enabled');
    cy.get(dataSelector('selecteur-operateur-erreur')).should('not.exist');
    cy.wrap(liste.lectures).should('deep.equal', [0, 0]);
  };

  const thenTheFailedReportLeavesAllOperatorChoicesAvailable = (): void => {
    cy.get(dataSelector('synthese-error')).should('be.visible');
    cy.get(dataSelector('selecteur-operateur-proposition')).should('have.length', 3);
  };

  const whenEscapingFromAProposal = (): void => {
    cy.get(dataSelector('selecteur-operateur-recherche')).should('be.focused');
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.press(Cypress.Keyboard.Keys.ESC);
  };

  const whenChoosingTheCurrentOperatorWithTheKeyboard = (): void => {
    cy.get(dataSelector('selecteur-operateur-recherche')).type('Jean');
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.get(dataSelector('selecteur-operateur-proposition')).filter('[aria-current="true"]').should('be.focused');
    cy.get(dataSelector('selecteur-operateur-proposition')).filter('[aria-current="true"]').type('{enter}');
  };

  const whenOpeningAndCapturingTheSelector = (width: number): void => {
    whenOpeningTheSelector();
    cy.get(dataSelector('selecteur-operateur-recherche')).should('be.focused');
    cy.screenshot(`selecteur-operateur-${String(width)}`, { capture: 'viewport' });
  };

  const thenThePanelFitsTheViewportWithTouchableTargets = (width: number): void => {
    cy.get(dataSelector('selecteur-operateur-panneau')).should(panel => {
      const rect = requiredFixture(panel[0]).getBoundingClientRect();
      expect(rect.left).to.be.at.least(0);
      expect(rect.right).to.be.at.most(width);
      expect(rect.top).to.be.at.least(0);
      expect(rect.bottom).to.be.at.most(900);
    });
    cy.get(dataSelector('selecteur-operateur-proposition')).should(proposals => {
      for (const proposal of proposals) {
        expect(proposal.getBoundingClientRect().height).to.be.at.least(44);
      }
    });
  };

  const givenLongOperatorName = (): void => {
    const operateur = { id: 'op-1', nom: 'Dupont de la Manufacture des Outils de Précision', prenom: 'Jean François Alexandre' };
    rapports.seed({ synthese: { ...syntheseFixture(2026, 38), operateur }, feuille: { ...feuilleFixture(2026, 38), operateur } });
  };

  const whenVisitingTheReportAt = (width: number): void => {
    cy.viewport(width, 900);
    cy.clock(HORLOGE, ['Date']);
    cy.visit(ADRESSE);
  };

  const thenTheMobileControlKeepsTheFullAccessibleName = (): void => {
    cy.get(dataSelector('selecteur-operateur')).should(control => {
      const rect = requiredFixture(control[0]).getBoundingClientRect();
      expect(rect.width).to.equal(288);
      expect(rect.height).to.be.at.least(44);
      expect(rect.right).to.be.at.most(320);
      expect(control.text()).to.contain('Jean François Alexandre DUPONT DE LA MANUFACTURE DES OUTILS DE PRÉCISION');
    });
    cy.get(dataSelector('selecteur-operateur')).then(control => {
      cy.get(dataSelector('synthese-annee')).should(annee => {
        expect(requiredFixture(annee[0]).getBoundingClientRect().top).to.be.at.least(
          requiredFixture(control[0]).getBoundingClientRect().bottom,
        );
      });
    });
  };

  const thenNoOperatorIsAvailableForChoice = (): void => {
    cy.get(dataSelector('selecteur-operateur-vide')).should('contain.text', 'Aucun opérateur disponible');
    cy.get(dataSelector('selecteur-operateur')).should('be.disabled');
    cy.get(dataSelector('synthese-operationnel-total')).should('have.text', '2 h 00');
  };

  const thenTheOperatorListFailureLeavesHoursReadable = (): void => {
    cy.get(dataSelector('selecteur-operateur-erreur')).should('be.visible');
    cy.get(dataSelector('selecteur-operateur-reessayer')).should('be.visible');
    cy.get(dataSelector('synthese-operationnel-total')).should('have.text', '2 h 00');
  };

  const givenPendingOperatorList = (): void => {
    releaseList = liste.suspend();
  };

  const thenTheListLoadsIndependentlyOfHours = (): void => {
    cy.get(dataSelector('synthese-operationnel-total')).should('have.text', '2 h 00');
    cy.get(dataSelector('selecteur-operateur-chargement')).should('be.visible');
    cy.get(dataSelector('selecteur-operateur')).should('be.disabled').and('contain.text', 'Jean DUPONT');
  };

  const givenPendingReport = (): void => {
    releaseReport = rapports.suspendSynthese();
  };

  const thenThePendingConsultationIsIdentified = (): void => {
    cy.get(dataSelector('synthese-loading')).should('be.visible');
    cy.get(dataSelector('selecteur-operateur')).should('contain.text', 'Jean DUPONT');
    cy.get(dataSelector('synthese-operationnel-total')).should('not.exist');
  };

  const thenTheSearchIsEmpty = (): void => {
    cy.get(dataSelector('selecteur-operateur-recherche')).should('have.value', '');
  };

  const whenChoosingTheCurrentOperator = (): void => {
    cy.get(dataSelector('selecteur-operateur-proposition')).filter('[aria-current="true"]').click();
  };

  const whenClickingThePeriodControlOutsideThePanel = (): void => {
    cy.get(dataSelector('synthese-semaine-precedente')).click();
  };

  const thenThePanelIsClosedAndThePeriodControlFocused = (): void => {
    cy.get(dataSelector('selecteur-operateur-panneau')).should('not.exist');
    cy.get(dataSelector('synthese-semaine-precedente')).should('be.focused');
  };

  const whenEscapingFromSearch = (): void => {
    cy.get(dataSelector('selecteur-operateur-recherche')).type('{esc}');
  };

  const thenThePanelIsClosedAndTheTriggerFocused = (): void => {
    cy.get(dataSelector('selecteur-operateur-panneau')).should('not.exist');
    cy.get(dataSelector('selecteur-operateur')).should('be.focused').and('have.attr', 'aria-expanded', 'false');
  };

  const thenTheCurrentOperatorIsIdentified = (): void => {
    cy.get(dataSelector('selecteur-operateur-proposition'))
      .filter('[aria-current="true"]')
      .should('have.length', 1)
      .and('contain.text', 'Jean DUPONT')
      .and('contain.text', 'Consulté');
  };

  const thenNoOperatorMatchesTheSearch = (): void => {
    cy.get(dataSelector('selecteur-operateur-sans-resultat')).should('contain.text', 'Aucun opérateur ne correspond à cette recherche');
    cy.get(dataSelector('selecteur-operateur-proposition')).should('not.exist');
  };

  const whenSearching = (query: string): void => {
    cy.get(dataSelector('selecteur-operateur-recherche')).type(query);
  };

  const thenTheConsultationHasNotChanged = (): void => {
    cy.location('pathname').should('equal', '/operateurs/op-1/heures');
    cy.get('@syntheseRead.all').should('have.length', 1);
  };

  const thenTheChoicesAre = (names: readonly string[]): void => {
    cy.get(dataSelector('selecteur-operateur-proposition'))
      .find(dataSelector('selecteur-operateur-nom'))
      .should(choices => {
        expect([...choices].map(choice => choice.textContent?.trim())).to.deep.equal(names);
      });
  };

  const whenOpeningTheSelector = (): void => {
    cy.get(dataSelector('selecteur-operateur')).click();
  };

  const thenTheSearchIsFocusedAndAllOperatorsAreAvailable = (): void => {
    cy.get(dataSelector('selecteur-operateur-recherche')).should('be.focused').and('have.attr', 'aria-label', 'Rechercher un opérateur');
    cy.get(dataSelector('selecteur-operateur')).should('have.attr', 'aria-expanded', 'true');
    cy.get(dataSelector('selecteur-operateur-proposition')).should('have.length', 3);
  };

  const givenAvailableReports = (): void => {
    rapports.install();
    liste.install();
  };

  const whenVisitingTheReport = (): void => {
    cy.viewport(1280, 900);
    cy.clock(HORLOGE, ['Date']);
    cy.visit(ADRESSE);
  };

  const thenTheConsultedOperatorIsAvailableInTheHeader = (): void => {
    cy.get(dataSelector('selecteur-operateur')).should('contain.text', 'Jean DUPONT');
    cy.get(dataSelector('selecteur-operateur')).then(control => {
      cy.get(dataSelector('synthese-annee')).should(annee => {
        expect(requiredFixture(control[0]).getBoundingClientRect().right).to.be.lessThan(
          requiredFixture(annee[0]).getBoundingClientRect().left,
        );
      });
    });
  };
});

const requiredFixture = <T>(value: T | undefined): T => {
  if (value === undefined) {
    throw new Error('Required fixture missing');
  }
  return value;
};
