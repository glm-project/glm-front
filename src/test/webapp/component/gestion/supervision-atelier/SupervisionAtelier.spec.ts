import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';

describe('Supervision tile readability', () => {
  [320, 768, 1280].forEach(width => {
    it(`should keep presence and activity details readable at ${width}px`, () => {
      givenViewport(width);

      whenOpeningSupervision();

      thenTilesRemainReadable();
    });
  });

  it('should preserve presence colours when GLM, NC or an anomaly is displayed', () => {
    whenOpeningSupervision();

    thenPresenceColoursRemainIndependent();
  });
});

const givenViewport = (width: number): void => {
  cy.viewport(width, 900);
};

const whenOpeningSupervision = (): void => {
  cy.clock(new Date(2026, 8, 13, 10, 0).getTime(), ['Date']);
  cy.visit('/');
};

const thenTilesRemainReadable = (): void => {
  cy.get(dataSelector('supervision-tuile'))
    .should('have.length', 7)
    .each(tile => {
      const element = requiredFixture(tile[0], 'rendered supervision content');
      expect(element.scrollWidth).to.be.at.most(element.clientWidth);
    });
  cy.get(dataSelector('supervision-activite-nom'))
    .should('have.length', 4)
    .each(name => {
      const element = requiredFixture(name[0], 'rendered supervision content');
      expect(element.scrollWidth).to.be.at.most(element.clientWidth);
    });
  cy.get(dataSelector('supervision-presence')).each(presence => {
    const element = requiredFixture(presence[0], 'rendered supervision content');
    expect(element.scrollWidth).to.be.at.most(element.clientWidth);
  });
  cy.get(dataSelector('supervision-atelier'))
    .should('be.visible')
    .then(view => {
      const element = requiredFixture(view[0], 'rendered supervision content');
      expect(element.scrollWidth).to.be.at.most(element.clientWidth);
    });
  cy.get(dataSelector('supervision-refresh')).focus();
  cy.get(dataSelector('supervision-refresh')).should('have.focus').and('have.css', 'outline-style', 'solid');
  cy.screenshot('supervision-responsive', { capture: 'fullPage' });
};

const thenPresenceColoursRemainIndependent = (): void => {
  cy.get(dataSelector('supervision-presence')).eq(0).should('have.css', 'background-color', 'rgb(185, 28, 28)');
  cy.get(dataSelector('supervision-presence')).eq(1).should('have.css', 'background-color', 'rgb(133, 77, 14)');
  cy.get(dataSelector('supervision-presence')).eq(2).should('have.css', 'background-color', 'rgb(22, 101, 52)');
  cy.get(dataSelector('supervision-presence')).eq(3).should('have.css', 'background-color', 'rgb(22, 101, 52)');
  cy.get(dataSelector('supervision-presence')).eq(4).should('have.css', 'background-color', 'rgb(22, 101, 52)');
  cy.get(dataSelector('supervision-presence')).eq(5).should('have.css', 'background-color', 'rgb(133, 77, 14)');
  cy.get(dataSelector('supervision-presence')).eq(6).should('have.css', 'background-color', 'rgb(185, 28, 28)');
};
