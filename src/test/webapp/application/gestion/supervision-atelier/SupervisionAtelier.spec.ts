import { dataSelector } from '../../../utils/DataSelector';

describe('Supervision atelier in back office', () => {
  it('should display the four supervision lanes on the root path', () => {
    whenVisitingTheRoot();

    thenTheFourLanesAreDisplayed();
  });

  it('should retain activities and anomalies after refreshing supervision', () => {
    whenVisitingTheRoot();
    whenRefreshingTheWorkshop();

    thenTheActivityAndAnomaliesRemainVisible();
  });
});

const whenVisitingTheRoot = (): void => {
  cy.viewport(1440, 900);
  cy.clock(new Date(2026, 8, 24, 9, 10).getTime(), ['Date']);
  cy.visit('/');
};

const whenRefreshingTheWorkshop = (): void => {
  cy.get(dataSelector('supervision-refresh')).should('not.be.disabled').click();
  cy.get(dataSelector('supervision-refresh')).should('not.be.disabled');
  cy.get(dataSelector('supervision-plateau')).should('not.have.attr', 'aria-busy');
};

const thenTheFourLanesAreDisplayed = (): void => {
  [
    { couloir: 'supervision-couloir-au-travail', nombre: '7' },
    { couloir: 'supervision-couloir-sans-affectation', nombre: '1' },
    { couloir: 'supervision-couloir-en-pause', nombre: '3' },
    { couloir: 'supervision-couloir-absents', nombre: '2' },
  ].forEach(({ couloir, nombre }) => {
    cy.get(dataSelector(couloir)).find(dataSelector('supervision-couloir-nombre')).should('have.text', nombre);
  });
  cy.get(dataSelector('supervision-presents')).should('contain.text', 'Présents').and('contain.text', '8');
  cy.get(dataSelector('supervision-derniere-lecture')).should(
    'contain.text',
    '13 opérateurs · d’après les pointages reçus jusqu’à 09:10 · actualisé toutes les 30 s',
  );
};

const thenTheActivityAndAnomaliesRemainVisible = (): void => {
  cy.get(dataSelector('supervision-anomalie')).should('have.length', 3).and('be.visible');
  cy.get(dataSelector('supervision-couloir-absents'))
    .find(dataSelector('supervision-carte'))
    .filter('[data-operateur-id="op-perrin"]')
    .within(() => {
      cy.get(dataSelector('supervision-activite-element')).should('contain.text', 'OF').and('contain.text', '3006');
      cy.get(dataSelector('supervision-anomalie')).should('contain.text', 'Activité d’un opérateur absent');
    });
  cy.get(dataSelector('supervision-signal-nc')).should('contain.text', '2 en NC').and('contain.text', 'Garnier Thomas, Morel Inès');
  cy.get(dataSelector('supervision-signal-a-verifier'))
    .should('contain.text', '3 à vérifier')
    .and('contain.text', 'Marchand Kevin, Perrin Loïc, Schmitt Yanis');
  cy.screenshot('supervision-desktop', { capture: 'fullPage' });
};
