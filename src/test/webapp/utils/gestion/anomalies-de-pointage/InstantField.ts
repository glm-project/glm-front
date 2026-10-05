import { dataSelector } from '../../DataSelector';
import { instantFieldTextsFixture } from './InstantLocal.fixture';

export const whenTypingTheInstant = (local: Date): void => {
  const { date, time } = instantFieldTextsFixture(local);
  cy.get(dataSelector('anomalie-instant-date')).clear();
  cy.get(dataSelector('anomalie-instant-date')).type(date);
  cy.get(dataSelector('anomalie-instant-heure')).clear();
  cy.get(dataSelector('anomalie-instant-heure')).type(time);
};

export const thenTheInstantFieldsShow = (local: Date): void => {
  const { date, time } = instantFieldTextsFixture(local);
  cy.get(dataSelector('anomalie-instant-date')).should('have.value', date);
  cy.get(dataSelector('anomalie-instant-heure')).should('have.value', time);
};

export const thenTheInstantFieldsAreEmpty = (): void => {
  cy.get(dataSelector('anomalie-instant-date')).should('have.value', '');
  cy.get(dataSelector('anomalie-instant-heure')).should('have.value', '');
};
