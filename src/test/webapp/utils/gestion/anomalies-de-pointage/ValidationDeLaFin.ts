import { dataSelector } from '../../DataSelector';

export const whenValidatingTheEnd = (): void => {
  cy.get(dataSelector('anomalie-resolution-valider')).click();
};

export const thenTheEndIsSaidRegularisedAt = (heure: string): void => {
  cy.get(dataSelector('anomalie-resolution-regularisee')).should('contain.text', `Fin régularisée à ${heure}`);
  cy.get(dataSelector('anomalie-resolution-valider')).should('not.exist');
};

export const thenTheRefusalIsSaid = (message: string): void => {
  cy.get(dataSelector('anomalie-resolution-refus')).should('contain.text', message);
};
