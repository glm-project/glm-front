import { dataSelector } from '../../DataSelector';

export const whenSelectingPointage = (pointage: string): void => {
  cy.get(`#pointage-${pointage}`).find(dataSelector('anomalie-pointage-selectionner')).click();
};

export const whenCorrectingPointage = (pointage: string): void => {
  whenSelectingPointage(pointage);
  cy.get(dataSelector('anomalie-selection')).find(dataSelector('anomalie-corriger')).click();
};

export const whenCancellingPointage = (pointage: string): void => {
  whenSelectingPointage(pointage);
  cy.get(dataSelector('anomalie-selection')).find(dataSelector('anomalie-annuler')).click();
};
