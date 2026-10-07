import { dataSelector } from '../../DataSelector';
import { SyntheseDesHeuresApiFixture } from '../releve-des-heures/SyntheseDesHeuresApiFixture';

export const givenTheHoursOfTheOperator = (): SyntheseDesHeuresApiFixture => {
  const synthese = new SyntheseDesHeuresApiFixture();
  synthese.install();
  return synthese;
};

export const whenFollowingTheLinkToTheDayOfTheOperator = (): void => {
  cy.get(dataSelector('anomalie-frise-journee')).click();
};

export const thenTheHoursOpenOnTheDay = (
  synthese: SyntheseDesHeuresApiFixture,
  semaine: { annee: string; semaine: string },
  jour: string,
): void => {
  cy.get(dataSelector('synthese-jour-cell')).should('have.length', 7);
  cy.wrap(synthese.lectures).should('deep.equal', [semaine]);
  cy.get(dataSelector('synthese-jour-lien')).filter('[aria-current="true"]').should('have.length', 1).and('contain.text', jour);
};
