import { dataSelector } from '../../DataSelector';
import { instantFieldTextsFixture } from './InstantLocal.fixture';

const CHAMP_DU_DOSSIER_COMPLET = 'anomalie-instant';

export const whenTypingTheInstant = (local: Date): void => {
  const { date, time } = instantFieldTextsFixture(local);
  cy.get(dataSelector(`${CHAMP_DU_DOSSIER_COMPLET}-date`)).clear();
  cy.get(dataSelector(`${CHAMP_DU_DOSSIER_COMPLET}-date`)).type(date);
  cy.get(dataSelector(`${CHAMP_DU_DOSSIER_COMPLET}-heure`)).clear();
  cy.get(dataSelector(`${CHAMP_DU_DOSSIER_COMPLET}-heure`)).type(time);
};

export const thenTheInstantFieldsShow = (local: Date): void => {
  const { date, time } = instantFieldTextsFixture(local);
  cy.get(dataSelector(`${CHAMP_DU_DOSSIER_COMPLET}-date`)).should('have.value', date);
  cy.get(dataSelector(`${CHAMP_DU_DOSSIER_COMPLET}-heure`)).should('have.value', time);
};

export const thenTheInstantFieldsAreEmpty = (): void => {
  cy.get(dataSelector(`${CHAMP_DU_DOSSIER_COMPLET}-date`)).should('have.value', '');
  cy.get(dataSelector(`${CHAMP_DU_DOSSIER_COMPLET}-heure`)).should('have.value', '');
};
