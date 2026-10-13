import { dataSelector } from '../../../utils/DataSelector';
import { longPressFixture } from '../../../utils/LongPressFixture';
import { requiredFixture } from '../../../utils/RequiredFixture';

describe('Pupitre layout in a browser', () => {
  it('should keep both workshop targets inside their tile on a tablet', () => {
    givenThePupitre(1024, 768);

    whenDesignatingJean();

    thenBothTargetsFitTheirTile(['moule-1', 'of-1']);
    thenCaptureTheScreen('tablet-pointage');
  });

  it('should keep mold targets inside their tile on a narrow screen', () => {
    givenThePupitre(390, 844);

    whenDesignatingJean();

    thenBothTargetsFitTheirTile(['moule-1', 'of-1']);
  });

  it('should keep the code field height when the first digit is typed', () => {
    givenThePupitre(1024, 768);
    givenTheHeightOf('code');

    whenTyping('0');

    thenHeightStays('code');
    thenCaptureTheScreen('tablet-keypad');
  });

  it('should give both targets of a free tile the same size', () => {
    givenThePupitre(1024, 768);

    whenDesignatingJean();

    thenBothTargetsHaveTheSameSize('of-1');
  });

  it('should keep the global commands as tall as the tile targets', () => {
    givenThePupitre(1024, 768);

    whenDesignatingJean();

    thenControlsAreAtLeast(['pause', 'resume', 'stop-all', 'show-mes-pointages'], 64);
  });

  it('should keep the keypad controls within a short landscape screen', () => {
    givenThePupitre(1024, 600);

    thenControlsFitTheScreen(['digit-1', 'digit-9', 'erase', 'digit-0', 'validate']);
    thenCaptureTheScreen('landscape-keypad');
  });

  it('should keep operator commands within a narrow screen', () => {
    givenThePupitre(390, 844);
    whenDesignatingJean();

    thenControlsFitTheScreen(['header-operator', 'finish', 'pause', 'resume', 'stop-all']);
    thenCaptureTheScreen('narrow-pointage');
  });

  it('should keep workstation choices within a narrow screen', () => {
    givenThePupitre(390, 844);
    whenDesignatingJean();
    whenOpeningWorkstationChoice();

    thenControlsFitTheScreen(['workstation-tour', 'workstation-fraiseuse', 'cancel-workstation']);
    thenCaptureTheScreen('narrow-workstation');
  });
});

const givenThePupitre = (width: number, height: number): void => {
  cy.viewport(width, height);
  cy.visit('/');
  cy.get(dataSelector('designation')).should('be.visible');
};

const whenDesignatingJean = (): void => {
  for (const digit of ['0', '4', '9']) cy.get(dataSelector(`digit-${digit}`)).click();
  cy.get(dataSelector('validate')).click();
  cy.get(dataSelector('pointage')).should('be.visible');
};

const whenTyping = (digit: string): void => {
  cy.get(dataSelector(`digit-${digit}`)).click();
};

const whenOpeningWorkstationChoice = (): void => {
  longPressFixture(cy.get(dataSelector('tile-of-1')).find(dataSelector('primary-target')));
  cy.get(dataSelector('workstation-dialog')).should('be.visible');
};

const thenBothTargetsFitTheirTile = (tileIds: readonly string[]): void => {
  for (const tileId of tileIds) {
    cy.get(dataSelector(`tile-${tileId}`)).should(tiles => {
      const tile = requiredFixture(tiles[0], tileId);
      const bounds = tile.getBoundingClientRect();
      for (const selector of ['primary-target', 'secondary-target']) {
        const target = requiredFixture(tile.querySelector<HTMLElement>(dataSelector(selector)), selector);
        const targetBounds = target.getBoundingClientRect();
        expect(targetBounds.left, `${tileId} ${selector} left edge`).to.be.at.least(bounds.left);
        expect(targetBounds.right, `${tileId} ${selector} right edge`).to.be.at.most(bounds.right);
        expect(targetBounds.width, `${tileId} ${selector} touch width`).to.be.at.least(44);
        expect(targetBounds.height, `${tileId} ${selector} touch height`).to.be.at.least(64);
        expect(target.scrollWidth, `${tileId} ${selector} full label`).to.be.at.most(target.clientWidth);
      }
    });
  }
};

const heightOf = (element: HTMLElement | undefined, selector: string): number =>
  requiredFixture(element, selector).getBoundingClientRect().height;

const givenTheHeightOf = (selector: string): void => {
  cy.get(dataSelector(selector))
    .then(elements => heightOf(elements[0], selector))
    .as(`${selector}-height`);
};

const thenHeightStays = (selector: string): void => {
  cy.get<number>(`@${selector}-height`).then(expectedHeight => {
    cy.get(dataSelector(selector)).should(elements => {
      expect(heightOf(elements[0], selector), `${selector} height`).to.equal(expectedHeight);
    });
  });
};

const thenBothTargetsHaveTheSameSize = (tileId: string): void => {
  cy.get(dataSelector(`tile-${tileId}`)).should(tiles => {
    const tile = requiredFixture(tiles[0], tileId);
    const boundsOf = (selector: string): DOMRect =>
      requiredFixture(tile.querySelector<HTMLElement>(dataSelector(selector)), selector).getBoundingClientRect();
    const primary = boundsOf('primary-target');
    const secondary = boundsOf('secondary-target');
    expect(secondary.height, `${tileId} targets height`).to.equal(primary.height);
    expect(secondary.width, `${tileId} targets width`).to.be.closeTo(primary.width, 1);
  });
};

const thenControlsAreAtLeast = (selectors: readonly string[], height: number): void => {
  for (const selector of selectors) {
    cy.get(dataSelector(selector)).should(elements => {
      expect(heightOf(elements[0], selector), `${selector} height`).to.be.at.least(height);
    });
  }
};

const thenControlsFitTheScreen = (selectors: readonly string[]): void => {
  for (const selector of selectors) {
    cy.get(dataSelector(selector)).should(elements => {
      const element = requiredFixture(elements[0], selector);
      const bounds = element.getBoundingClientRect();
      const viewport = element.ownerDocument.documentElement;
      expect(bounds.left, `${selector} left edge`).to.be.at.least(0);
      expect(bounds.top, `${selector} top edge`).to.be.at.least(0);
      expect(bounds.right, `${selector} right edge`).to.be.at.most(viewport.clientWidth);
      expect(bounds.bottom, `${selector} bottom edge`).to.be.at.most(viewport.clientHeight);
    });
  }
};

const thenCaptureTheScreen = (name: string): void => {
  cy.screenshot(name, { capture: 'viewport' });
};
