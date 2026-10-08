import { dataSelector } from '../../DataSelector';

export const markerOf = (pointage: string) =>
  cy.get(dataSelector('anomalie-frise')).find(dataSelector('anomalie-pointage')).filter(`[data-pointage="${pointage}"]`);
