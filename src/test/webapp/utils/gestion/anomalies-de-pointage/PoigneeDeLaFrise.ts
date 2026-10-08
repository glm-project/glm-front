import { dataSelector } from '../../DataSelector';
import { echeanceFinAutomatiqueLocalFixture } from './FinAutomatiqueHttp.fixture';

const MILLISECONDES_PAR_MINUTE = 60_000;
const MINUTES_PAR_FLECHE_AVEC_MAJ = 15;

const touchesVers = (instant: Date, depart: Date): string => {
  const ecart = Math.round((instant.getTime() - depart.getTime()) / MILLISECONDES_PAR_MINUTE);
  const fleche = ecart < 0 ? '{leftArrow}' : '{rightArrow}';
  const minutes = Math.abs(ecart);
  const posee = fleche;
  const minuteParMinute = fleche.repeat(minutes % MINUTES_PAR_FLECHE_AVEC_MAJ);
  const quartParQuart = fleche.repeat(Math.floor(minutes / MINUTES_PAR_FLECHE_AVEC_MAJ));
  return `${posee}${minuteParMinute}{shift}${quartParQuart}`;
};

export const whenPlacingTheHourWithTheHandleAt = (instant: Date, finRecue = echeanceFinAutomatiqueLocalFixture): void => {
  cy.get(dataSelector('anomalie-poignee')).should('have.attr', 'data-sans-heure');
  cy.get(dataSelector('anomalie-poignee')).focus();
  cy.get(dataSelector('anomalie-poignee')).type(touchesVers(instant, finRecue));
  cy.get(dataSelector('anomalie-poignee')).should('have.attr', 'aria-valuenow', String(instant.getTime()));
};

export const thenTheHandleHolds = (instant: Date): void => {
  cy.get(dataSelector('anomalie-poignee')).should('have.attr', 'aria-valuenow', String(instant.getTime()));
  cy.get(dataSelector('anomalie-poignee')).should('not.have.attr', 'data-sans-heure');
};

export const thenTheHandleHoldsNoHour = (): void => {
  cy.get(dataSelector('anomalie-poignee')).should('have.attr', 'data-sans-heure');
  cy.get(dataSelector('anomalie-poignee')).should('not.have.attr', 'aria-valuenow');
};
