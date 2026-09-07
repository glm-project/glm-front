import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';

describe('Pupitre layout in a browser', () => {
  it('should keep both workshop targets inside their tile on a tablet', () => {
    givenThePupitre(1024, 768);

    whenDesignatingJean();

    thenBothTargetsFitTheirTile();
    thenCaptureTheScreen('tablet-pointage');
  });

  it('should keep the keypad controls within a short landscape screen', () => {
    givenThePupitre(1024, 600);

    thenControlsFitTheScreen(['digit-1', 'digit-9', 'erase', 'digit-0', 'validate']);
    thenCaptureTheScreen('landscape-keypad');
  });

  it('should keep operator commands and workstation choices within a narrow screen', () => {
    givenThePupitre(390, 844);

    whenDesignatingJean();

    thenControlsFitTheScreen(['header-operator', 'finish', 'pause', 'resume', 'stop-all']);
    thenCaptureTheScreen('narrow-pointage');
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

const whenOpeningWorkstationChoice = (): void => {
  cy.get(dataSelector('tile-of-1')).find(dataSelector('primary-target')).click();
  cy.get(dataSelector('workstation-dialog')).should('be.visible');
};

const thenBothTargetsFitTheirTile = (): void => {
  cy.get(dataSelector('tile-of-1')).should(tiles => {
    const tile = requiredFixture(tiles[0], 'tile');
    const bounds = tile.getBoundingClientRect();
    for (const selector of ['primary-target', 'secondary-target']) {
      const target = requiredFixture(tile.querySelector<HTMLElement>(dataSelector(selector)), selector);
      const targetBounds = target.getBoundingClientRect();
      expect(targetBounds.left, `${selector} left edge`).to.be.at.least(bounds.left);
      expect(targetBounds.right, `${selector} right edge`).to.be.at.most(bounds.right);
      expect(targetBounds.width, `${selector} touch width`).to.be.at.least(44);
      expect(targetBounds.height, `${selector} touch height`).to.be.at.least(44);
      expect(target.scrollWidth, `${selector} full label`).to.be.at.most(target.clientWidth);
    }
  });
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
