import { dataSelector } from '../../../utils/DataSelector';
import { CONFIRMATION_PRESS_FIXTURE_MS, longPressFixture } from '../../../utils/LongPressFixture';
import { requiredFixture } from '../../../utils/RequiredFixture';
import { holdTouchFixture, releaseTouchFixture, slideTouchFixture, touchFixture } from '../../../utils/TouchscreenFixture';

describe('Pointage screen in a browser', () => {
  beforeEach(() => {
    cy.viewport(1920, 1080);
  });

  it('should present each category in its own zone and preserve the two tactile targets', () => {
    givenThePointageScreen();

    thenEachCategoryHasItsOwnZone();
    thenEachTileHasTwoPermanentTouchTargets();
    thenTheCompleteScreenChromeIsVisible();
  });

  it('should propose workstations when opening an activity', () => {
    givenThePointageScreen();
    whenHoldingTileTarget('of-1', 'primary-target');

    thenWorkstationsAreProposed();
  });

  it('should propose no workstation on a brief touch of a tile target', () => {
    givenThePointageScreen();
    whenTouchingBriefly('primary-target');
    whenWellPastTheConfirmationDelay();

    thenNoWorkstationIsProposed();
  });

  it('should propose no workstation when a touch on a tile target slides into a scroll', () => {
    givenThePointageScreen();
    whenSlidingATouchIntoAScroll('primary-target');

    thenTheGridHasScrolled();
    thenNoWorkstationIsProposed();
  });

  it('should propose workstations after a sustained touch of a tile target', () => {
    givenThePointageScreen();
    whenTouchingThroughTheConfirmationDelay('primary-target');

    thenAWorkstationChoiceIsOpen();
  });

  it('should fill a tile target over the confirmation delay while it is touched', () => {
    givenThePointageScreen();
    const fill = whenObservingTheFillHalfwayThroughATouch('primary-target');

    thenTheTargetFillsOverTheConfirmationDelay(fill);
  });

  it('should keep the tile spatially stable after choosing a workstation', () => {
    givenThePointageScreen();
    const position = givenTheTilePosition('of-1');
    whenHoldingTileTarget('of-1', 'primary-target');
    whenChoosingWorkstation('tour');

    thenTheTileIsActiveAt('of-1', position);
  });

  it('should mark a nonconforming tile in yellow with ink text', () => {
    givenThePointageScreen();
    givenAnOngoingActivity('of-1', 'tour');
    whenHoldingTileTarget('of-1', 'secondary-target');

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
    whenHoldingTileTarget(id, 'primary-target');
    whenChoosingWorkstation(workstation);
    cy.get(dataSelector(`tile-${id}`)).should('contain.text', 'ARRÊTER');
  };
  const givenTheTilePosition = (id: string): Cypress.Chainable<GridPositionFixture> =>
    cy.get(dataSelector(`tile-${id}`)).then(tile => positionInGrid(requiredFixture(tile[0], 'tile')));
  const whenHoldingTileTarget = (id: string, target: string): void => {
    longPressFixture(cy.get(dataSelector(`tile-${id}`)).find(dataSelector(target)));
  };
  const whenChoosingWorkstation = (id: string): void => {
    longPressFixture(cy.get(dataSelector(`workstation-${id}`)));
  };
  const whenTouchingBriefly = (target: string): void => {
    touchFixture(dataSelector(target));
  };
  const whenTheConfirmationDelayElapses = (): void => {
    cy.wait(CONFIRMATION_PRESS_FIXTURE_MS);
  };
  const whenWellPastTheConfirmationDelay = (): void => {
    cy.wait(2 * CONFIRMATION_PRESS_FIXTURE_MS);
  };
  const whenTouchingThroughTheConfirmationDelay = (target: string): void => {
    holdTouchFixture(dataSelector(target));
    whenTheConfirmationDelayElapses();
    releaseTouchFixture();
  };
  const whenSlidingATouchIntoAScroll = (target: string): void => {
    holdTouchFixture(dataSelector(target));
    slideTouchFixture(dataSelector(target), -200);
    whenWellPastTheConfirmationDelay();
    releaseTouchFixture();
  };
  const whenObservingTheFillHalfwayThroughATouch = (target: string): Cypress.Chainable<FillFixture> => {
    holdTouchFixture(dataSelector(target));
    cy.wait(CONFIRMATION_PRESS_FIXTURE_MS / 2);
    cy.get(dataSelector(target))
      .first()
      .then(target => {
        const [fill] = requiredFixture(target[0], 'touched target').getAnimations({ subtree: true });
        const timing = requiredFixture(requiredFixture(fill, 'fill animation').effect, 'fill effect').getComputedTiming();
        return { duration: timing.duration, progress: timing.progress };
      })
      .as('fill', { type: 'static' });
    releaseTouchFixture();
    return cy.get<FillFixture>('@fill');
  };
  const thenEachCategoryHasItsOwnZone = (): void => {
    cy.get(dataSelector('pointage-zone-titre')).should(titres => {
      expect(Array.from(titres, titre => titre.textContent.trim())).to.deep.equal(['MOULE', 'OF']);
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
  const thenNoWorkstationIsProposed = (): void => {
    cy.get(dataSelector('workstation-dialog')).should('not.exist');
  };
  const thenTheGridHasScrolled = (): void => {
    cy.get(dataSelector('pointage-grid')).should(grid => {
      expect(requiredFixture(grid[0], 'pointage grid').scrollTop).to.be.greaterThan(0);
    });
  };
  const thenAWorkstationChoiceIsOpen = (): void => {
    cy.get(dataSelector('workstation-dialog')).should('be.visible');
  };
  const thenTheTargetFillsOverTheConfirmationDelay = (fill: Cypress.Chainable<FillFixture>): void => {
    fill.then(observed => {
      expect(observed.duration, 'fill duration').to.equal(1_000);
      expect(observed.progress, 'fill progress halfway').to.be.greaterThan(0).and.lessThan(1);
    });
  };
  const thenTheTileIsActiveAt = (id: string, original: Cypress.Chainable<GridPositionFixture>): void => {
    original.then(before => {
      cy.get(dataSelector(`tile-${id}`)).should(tile => {
        const after = positionInGrid(requiredFixture(tile[0], 'tile'));
        expect(after, 'tile position in the grid and grid position on screen').to.deep.equal(before);
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
  const positionInGrid = (tile: HTMLElement): GridPositionFixture => {
    const grid = requiredFixture(tile.closest<HTMLElement>(dataSelector('pointage-grid')), 'pointage grid');
    const tileBox = tile.getBoundingClientRect();
    const gridBox = grid.getBoundingClientRect();
    return {
      x: tileBox.x - gridBox.x + grid.scrollLeft,
      y: tileBox.y - gridBox.y + grid.scrollTop,
      gridX: gridBox.x,
      gridY: gridBox.y,
    };
  };
});

interface GridPositionFixture {
  readonly x: number;
  readonly y: number;
  readonly gridX: number;
  readonly gridY: number;
}

interface FillFixture {
  readonly duration: ComputedEffectTiming['duration'];
  readonly progress: ComputedEffectTiming['progress'];
}
