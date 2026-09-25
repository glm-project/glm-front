import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';

describe('Gestion shell', () => {
  it('should show its header once booted', () => {
    whenVisitingTheRoot();

    thenTheHeaderIsVisible();
  });

  [1024, 1280, 1440].forEach(width => {
    it(`should keep the header on one line within the page at ${width}px`, () => {
      givenAScreenOfWidth(width);

      whenOpeningTheSupervision();

      thenEveryHeaderTextHoldsOnOneLine();
      thenThePageDoesNotScrollSideways();
    });
  });
});

const givenAScreenOfWidth = (width: number): void => {
  cy.viewport(width, 900);
};

const whenVisitingTheRoot = (): void => {
  cy.visit('/');
};

const whenOpeningTheSupervision = (): void => {
  cy.visit('/');
  cy.get(dataSelector('supervision-atelier')).should('be.visible');
};

const thenTheHeaderIsVisible = (): void => {
  cy.get(dataSelector('gestion-header')).should('be.visible');
};

const thenEveryHeaderTextHoldsOnOneLine = (): void => {
  cy.get(dataSelector('gestion-header')).then(header => {
    const element = requiredFixture(header[0], 'gestion header');
    textsOf(element).forEach(text => {
      expect(linesOf(text, element.ownerDocument), `lines of « ${text.textContent ?? ''} »`).to.be.at.most(1);
    });
  });
};

const thenThePageDoesNotScrollSideways = (): void => {
  cy.document().then(document => {
    expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth);
  });
};

const textsOf = (element: HTMLElement): Node[] => {
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const texts: Node[] = [];
  for (let text = walker.nextNode(); text !== null; text = walker.nextNode()) {
    texts.push(text);
  }
  return texts;
};

const linesOf = (text: Node, document: Document): number => {
  const range = document.createRange();
  range.selectNodeContents(text);
  return new Set(Array.from(range.getClientRects(), rect => rect.top)).size;
};
