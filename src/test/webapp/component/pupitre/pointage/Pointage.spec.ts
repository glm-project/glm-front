import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';

describe('Pointage screen in a browser', () => {
  beforeEach(() => {
    cy.viewport(1920, 1080);
  });

  it('should present molds two per row and preserve the two tactile targets', () => {
    givenThePointageScreen();

    thenMoldsArePresentedTwoPerRow();
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
  const givenTheTilePosition = (id: string): Cypress.Chainable<GridPositionFixture> =>
    cy.get(dataSelector(`tile-${id}`)).then(tile => positionInGrid(requiredFixture(tile[0], 'tile')));
  const whenPressingTileTarget = (id: string, target: string): void => {
    cy.get(dataSelector(`tile-${id}`))
      .find(dataSelector(target))
      .click();
  };
  const whenChoosingWorkstation = (id: string): void => {
    cy.get(dataSelector(`workstation-${id}`)).click();
  };
  const thenMoldsArePresentedTwoPerRow = (): void => {
    cy.get(dataSelector('moules-zone')).should(zones => {
      const zone = requiredFixture(zones[0], 'molds zone');
      const first = tileBounds(zone, 'moule-1');
      const second = tileBounds(zone, 'moule-2');
      const third = tileBounds(zone, 'moule-3');
      expect(second.top, 'second mold on the first row').to.equal(first.top);
      expect(second.left, 'second mold beside the first').to.be.greaterThan(first.right);
      expect(third.top, 'third mold on the next row').to.be.at.least(first.bottom);
      expect(third.left, 'third mold under the first').to.equal(first.left);
    });
  };
  const thenEachTileHasTwoPermanentTouchTargets = (): void => {
    for (const id of ['moule-1', 'of-1']) {
      cy.get(dataSelector(`tile-${id}`))
        .find('button')
        .should('have.length', 2)
        .each(button => {
          expect(requiredFixture(button[0], 'tile target').getBoundingClientRect().height).to.be.at.least(52);
        });
    }
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
  const thenTheTileIsActiveAt = (id: string, original: Cypress.Chainable<GridPositionFixture>): void => {
    original.then(before => {
      cy.get(dataSelector(`tile-${id}`)).should(tile => {
        const after = positionInGrid(requiredFixture(tile[0], 'tile'));
        expect(after.x).to.be.closeTo(before.x, 1);
        expect(after.y).to.be.closeTo(before.y, 1);
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
  const tileBounds = (zone: HTMLElement, id: string): DOMRect =>
    requiredFixture(zone.querySelector<HTMLElement>(dataSelector(`tile-${id}`)), id).getBoundingClientRect();
  const positionInGrid = (tile: HTMLElement): GridPositionFixture => {
    const grid = requiredFixture(tile.closest<HTMLElement>(dataSelector('pointage-grid')), 'pointage grid');
    const tileBox = tile.getBoundingClientRect();
    const gridBox = grid.getBoundingClientRect();
    return { x: tileBox.x - gridBox.x + grid.scrollLeft, y: tileBox.y - gridBox.y + grid.scrollTop };
  };
});

interface GridPositionFixture {
  readonly x: number;
  readonly y: number;
}
