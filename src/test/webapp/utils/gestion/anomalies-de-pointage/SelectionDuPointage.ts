import { dataSelector } from '../../DataSelector';

export const markerOf = (pointage: string) =>
  cy.get(dataSelector('anomalie-frise')).find(dataSelector('anomalie-pointage')).filter(`[data-pointage="${pointage}"]`);

const bar = (activite: string) =>
  cy.get(dataSelector('anomalie-frise')).find(dataSelector('anomalie-activite')).filter(`[data-activite="${activite}"]`);

export const whenSelectingPointage = (pointage: string): void => {
  markerOf(pointage).click();
};

export const whenSelectingActivity = (activite: string): void => {
  bar(activite).click();
};

export const whenCorrectingPointage = (pointage: string): void => {
  whenSelectingPointage(pointage);
  cy.get(dataSelector('anomalie-selection')).find(dataSelector('anomalie-corriger')).click();
};

export const whenCancellingPointage = (pointage: string): void => {
  whenSelectingPointage(pointage);
  cy.get(dataSelector('anomalie-selection')).find(dataSelector('anomalie-annuler')).click();
};

export const thenPointageIsSelected = (pointage: string): void => {
  markerOf(pointage).should('have.attr', 'aria-pressed', 'true');
};

export const thenActivityIsSelected = (activite: string): void => {
  bar(activite).should('have.attr', 'aria-pressed', 'true');
};
