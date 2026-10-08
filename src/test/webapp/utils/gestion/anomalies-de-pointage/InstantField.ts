import { dataSelector } from '../../DataSelector';
import { instantFieldTextsFixture } from './InstantLocal.fixture';

const CHAMP_DU_DOSSIER_COMPLET = 'anomalie-instant';
export const CHAMP_DE_LA_VUE_DE_RESOLUTION = 'anomalie-resolution-instant';

export const whenTypingTheInstant = (local: Date, champ = CHAMP_DU_DOSSIER_COMPLET): void => {
  const { date, time } = instantFieldTextsFixture(local);
  cy.get(dataSelector(`${champ}-date`)).clear();
  cy.get(dataSelector(`${champ}-date`)).type(date);
  cy.get(dataSelector(`${champ}-heure`)).clear();
  cy.get(dataSelector(`${champ}-heure`)).type(time);
};

export const thenTheInstantFieldsShow = (local: Date, champ = CHAMP_DU_DOSSIER_COMPLET): void => {
  const { date, time } = instantFieldTextsFixture(local);
  cy.get(dataSelector(`${champ}-date`)).should('have.value', date);
  cy.get(dataSelector(`${champ}-heure`)).should('have.value', time);
};

export const thenTheInstantFieldsAreEmpty = (champ = CHAMP_DU_DOSSIER_COMPLET): void => {
  cy.get(dataSelector(`${champ}-date`)).should('have.value', '');
  cy.get(dataSelector(`${champ}-heure`)).should('have.value', '');
};
