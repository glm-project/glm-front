import { dataSelector } from '../../../utils/DataSelector';
import { CoutDeRevientApiFixture } from '../../../utils/gestion/cout-de-revient/CoutDeRevientApiFixture';
import { ElementsApiFixture, elementsFixture } from '../../../utils/gestion/element-de-fabrication/ElementsApiFixture';
import { SyntheseDesHeuresApiFixture } from '../../../utils/gestion/releve-des-heures/SyntheseDesHeuresApiFixture';

describe('Week overview and consulted day', () => {
  it('should keep the same scale and width when an empty day is consulted', () => {
    givenOperationalWeek();

    whenConsultingSunday();

    thenDaysAreComparable();
    thenHoursHaveRoomInsideTheirColumn();
    thenSundayHasItsOwnDetail();
  });

  it('should find an element beyond the first server page', () => {
    givenLargeCatalogue();
    whenVisitingCatalogue();

    whenSearching('1134');

    thenTheMatchingReferenceIsVisible();
  });

  it('should recover the catalogue after a search with no result', () => {
    givenLargeCatalogue();
    whenVisitingCatalogue();
    whenSearching('introuvable');

    whenClearingSearch();

    thenTheFirstPageIsVisible();
  });

  it('should preserve the company reference and designation in the cost report', () => {
    givenRecognizableCostReport();

    whenConsultingCost();

    thenTheElementIdentityIsPreserved();
  });
});

const givenOperationalWeek = (): void => {
  new SyntheseDesHeuresApiFixture().install();
};
const givenLargeCatalogue = (): void => {
  new ElementsApiFixture(elementsFixture(120)).install();
};
const givenRecognizableCostReport = (): void => {
  new CoutDeRevientApiFixture().install();
  new ElementsApiFixture([
    { id: 'element-1', categorie: 'OF', nom: 'OF-2026-000001', reference: 'M24-0655', description: 'Support latéral' },
  ]).install();
};
const whenConsultingSunday = (): void => {
  cy.viewport(1440, 1000);
  cy.visit('/operateurs/op-1/heures?annee=2026&semaine=38&jour=2026-09-20');
};
const whenVisitingCatalogue = (): void => {
  cy.visit('/produits');
};
const whenSearching = (value: string): void => {
  cy.get(dataSelector('elements-search')).type(value);
};
const whenClearingSearch = (): void => {
  cy.get(dataSelector('elements-no-results')).should('be.visible');
  cy.get(dataSelector('elements-search')).clear();
};
const whenConsultingCost = (): void => {
  cy.visit('/couts-de-revient/element-1');
};
const thenDaysAreComparable = (): void => {
  cy.get(dataSelector('synthese-jour-cell')).should(cells => {
    const widths = Array.from(cells, cell => cell.getBoundingClientRect().width);
    expect(Math.max(...widths) - Math.min(...widths)).to.be.lessThan(1);
  });
  cy.get(dataSelector('synthese-jour-cell')).each(cell => {
    cy.wrap(cell)
      .find(dataSelector('synthese-repere'))
      .should('have.length', 2)
      .then(labels => {
        expect(Array.from(labels, label => label.textContent?.trim())).to.deep.equal(['0 h', '24 h']);
      });
  });
};
const thenHoursHaveRoomInsideTheirColumn = (): void => {
  cy.get(dataSelector('synthese-jour-cell')).each(cell => {
    const bounds = cell[0]?.getBoundingClientRect();
    cy.wrap(cell)
      .find(dataSelector('synthese-repere'))
      .should(labels => {
        for (const label of labels) {
          const box = label.getBoundingClientRect();
          expect(box.left - (bounds?.left ?? box.left)).to.be.at.least(10);
          expect((bounds?.right ?? box.right) - box.right).to.be.at.least(10);
        }
      });
  });
};
const thenSundayHasItsOwnDetail = (): void => {
  cy.get(dataSelector('synthese-detail-jour')).should('be.visible');
  cy.get(dataSelector('synthese-journal-vide')).should('be.visible');
};
const thenTheMatchingReferenceIsVisible = (): void => {
  cy.get(dataSelector('element-row')).should('have.length', 1);
  cy.get(dataSelector('element-reference-cell')).should('contain.text', '1134');
};
const thenTheFirstPageIsVisible = (): void => {
  cy.get(dataSelector('element-row')).should('have.length', 20);
};
const thenTheElementIdentityIsPreserved = (): void => {
  cy.get(dataSelector('cout-identite')).should('contain.text', 'M24-0655');
  cy.get(dataSelector('cout-nom')).should('contain.text', 'OF-2026-000001');
  cy.get(dataSelector('cout-libelle')).should('contain.text', 'Support latéral');
};
