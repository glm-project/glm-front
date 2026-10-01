import { dataSelector } from '../../../utils/DataSelector';

describe('Supervision atelier in back office', () => {
  it('should display the two supervision lanes on the root path', () => {
    whenVisitingTheRoot();

    thenTheTwoLanesAreDisplayed();
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

const thenTheTwoLanesAreDisplayed = (): void => {
  [
    { couloir: 'supervision-couloir-au-travail', nombre: '6' },
    { couloir: 'supervision-couloir-sans-activite', nombre: '7' },
  ].forEach(({ couloir, nombre }) => {
    cy.get(dataSelector(couloir)).find(dataSelector('supervision-couloir-nombre')).should('have.text', nombre);
  });
  cy.get(dataSelector('supervision-derniere-lecture')).should(
    'contain.text',
    '13 opérateurs · d’après les pointages reçus jusqu’à 09:10 · actualisé toutes les 30 s',
  );
};

const thenTheActivityAndAnomaliesRemainVisible = (): void => {
  cy.get(dataSelector('supervision-anomalie')).should('have.length', 1).and('be.visible');
  cy.get(dataSelector('supervision-couloir-sans-activite'))
    .find(dataSelector('supervision-carte'))
    .filter('[data-operateur-id="op-perrin"]')
    .within(() => {
      cy.get(dataSelector('supervision-sequence-en-conflit')).should('contain.text', 'Séquence en conflit').and('contain.text', 'OF 3006');
      cy.get(dataSelector('supervision-activite')).should('not.exist');
    });
  cy.get(dataSelector('supervision-signal-nc')).should('contain.text', '2 en NC').and('contain.text', 'Garnier Thomas, Morel Inès');
  cy.get(dataSelector('supervision-signal-a-verifier'))
    .should('contain.text', '4 à vérifier')
    .and('contain.text', 'Marchand Kevin, Morel Inès, Perrin Loïc, Schmitt Yanis');
};
