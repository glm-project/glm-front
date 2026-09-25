import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';

describe('Pointage screen in a browser', () => {
  beforeEach(() => {
    cy.viewport(1920, 1080);
  });

  it('should keep the nominal workshop visible without scrolling and preserve the two tactile targets', () => {
    givenThePointageScreen();

    thenTheWholeNominalGridFits();
    thenEachTileHasTwoPermanentTouchTargets();
    thenTheCompleteScreenChromeIsVisible();
  });

  it('should propose workstations when opening an activity', () => {
    givenThePointageScreen();
    whenPressingTileTarget('of-1', 'primary-target');

    thenWorkstationsAreProposed();
  });

  it('should keep the tile spatially stable after choosing a workstation', () => {
    givenThePointageScreen();
    const position = givenTheTilePosition('of-1');
    whenPressingTileTarget('of-1', 'primary-target');
    whenChoosingWorkstation('tour');

    thenTheTileIsActiveAt('of-1', position);
  });

  it('should mark a nonconforming tile in yellow with ink text', () => {
    givenThePointageScreen();
    givenAnOngoingActivity('of-1', 'tour');
    whenPressingTileTarget('of-1', 'secondary-target');

    thenTheNonConformityMarkerIsYellowWithInkText('of-1');
  });

  it('should use scrolling as a safety valve for an extreme workshop volume', () => {
    givenThePointageScreen('?many');

    thenTheGridCanScrollWithoutHidingTiles();
  });

  const givenThePointageScreen = (search = ''): void => {
    cy.visit(`/${search}`);
    cy.get(dataSelector('digit-0')).click();
    cy.get(dataSelector('digit-4')).click();
    cy.get(dataSelector('digit-9')).click();
    cy.get(dataSelector('validate')).click();
    cy.get(dataSelector('pointage'));
  };
  const givenAnOngoingActivity = (id: string, workstation: string): void => {
    whenPressingTileTarget(id, 'primary-target');
    whenChoosingWorkstation(workstation);
    cy.get(dataSelector(`tile-${id}`)).should('contain.text', 'ARRÊTER');
  };
  const givenTheTilePosition = (id: string): Cypress.Chainable<DOMRect> =>
    cy.get(dataSelector(`tile-${id}`)).then(tile => requiredFixture(tile[0], 'tile').getBoundingClientRect());
  const whenPressingTileTarget = (id: string, target: string): void => {
    cy.get(dataSelector(`tile-${id}`))
      .find(dataSelector(target))
      .click();
  };
  const whenChoosingWorkstation = (id: string): void => {
    cy.get(dataSelector(`workstation-${id}`)).click();
  };
  const thenTheWholeNominalGridFits = (): void => {
    cy.get(dataSelector('pointage-grid')).should(grid => {
      const element = requiredFixture(grid[0], 'pointage grid');
      expect(element.scrollHeight).to.be.at.most(element.clientHeight);
    });
  };
  const thenEachTileHasTwoPermanentTouchTargets = (): void => {
    cy.get(dataSelector('tile-of-1'))
      .find('button')
      .should('have.length', 2)
      .each(button => {
        expect(requiredFixture(button[0], 'tile target').getBoundingClientRect().height).to.be.at.least(44);
      });
  };
  const thenTheCompleteScreenChromeIsVisible = (): void => {
    cy.get(dataSelector('header-operator')).should('contain.text', 'Dupont Jean');
    cy.get(dataSelector('pause')).should('be.visible');
    cy.get(dataSelector('resume')).should('be.visible');
    cy.get(dataSelector('stop-all')).should('be.visible');
  };
  const thenWorkstationsAreProposed = (): void => {
    cy.get(dataSelector('workstation-dialog'))
      .should('be.visible')
      .and('contain.text', 'Sur quel poste ?')
      .and('contain.text', 'Élément 204');
    cy.get(dataSelector('workstation-dialog')).should('not.contain.text', 'of-1');
    cy.get(dataSelector('workstation-tour')).should('be.visible');
    cy.get(dataSelector('workstation-fraiseuse')).should('be.visible');
  };
  const thenTheTileIsActiveAt = (id: string, original: Cypress.Chainable<DOMRect>): void => {
    original.then(before => {
      cy.get(dataSelector(`tile-${id}`)).should(tile => {
        const after = requiredFixture(tile[0], 'tile').getBoundingClientRect();
        expect(after.x).to.equal(before.x);
        expect(after.y).to.equal(before.y);
        expect(tile.text()).to.contain('ARRÊTER');
      });
    });
  };
  const thenTheNonConformityMarkerIsYellowWithInkText = (id: string): void => {
    cy.get(dataSelector(`tile-${id}`))
      .find(dataSelector('nc-marker'))
      .should('have.css', 'background-color', 'rgb(234, 179, 8)')
      .and('have.css', 'color', 'rgb(15, 24, 36)');
  };
  const thenTheGridCanScrollWithoutHidingTiles = (): void => {
    cy.get(dataSelector('pointage-grid')).should(grid => {
      const element = requiredFixture(grid[0], 'pointage grid');
      expect(element.scrollHeight).to.be.greaterThan(element.clientHeight);
    });
    cy.get(dataSelector('tile-of-72')).should('exist');
  };
});
