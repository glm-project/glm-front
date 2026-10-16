import { dataSelector } from '../../../utils/DataSelector';
import {
  activiteRecue,
  elementRecu,
  instantLocal,
  JourneeApiFixture,
  journeeRecue,
  suiviRecu,
  tourRecu,
} from '../../../utils/gestion/correction-des-activites/JourneeApiFixture';
import { ParametrageApiFixture } from '../../../utils/gestion/parametrage/ParametrageApiFixture';
import { SyntheseDesHeuresApiFixture } from '../../../utils/gestion/releve-des-heures/SyntheseDesHeuresApiFixture';

const HORLOGE = new Date(2026, 9, 6, 10, 0).getTime();
const ELEMENT = elementRecu('1');
const SUIVIS = [suiviRecu('suivi-1', ELEMENT)];

const nuitDuLundiAuMardi = activiteRecue({
  id: 'nuit',
  suivi: 'suivi-1',
  element: ELEMENT,
  poste: tourRecu,
  debut: instantLocal(5, 22),
  fin: instantLocal(6, 3, 30),
  etat: 'TERMINEE',
  dureeSurLeJour: 'PT2H',
  autresJours: [{ jour: '2026-10-06', duree: 'PT3H30M' }],
});

const nuitVueDuMardi = activiteRecue({
  id: 'nuit',
  suivi: 'suivi-1',
  element: ELEMENT,
  poste: tourRecu,
  debut: instantLocal(5, 22),
  fin: instantLocal(6, 3, 30),
  etat: 'TERMINEE',
  dureeSurLeJour: 'PT3H30M',
  autresJours: [{ jour: '2026-10-05', duree: 'PT2H' }],
});

describe('Correction of a night in gestion', () => {
  it('should add an activity ending the next day from the report, announce each day and lead to the continuation on the next day', () => {
    givenTheReportAndTheDaysOfTheNight();

    whenCorrectingTheDayFromTheReport();
    whenAddingTheNightFinishedTheNextDay();
    whenOpeningTheNextDayFromTheMessage();

    thenTheNextDayShowsTheContinuationWithoutTheMessage();
  });
});

const givenTheReportAndTheDaysOfTheNight = (): void => {
  new ParametrageApiFixture().install();
  new SyntheseDesHeuresApiFixture().install();
  const journees = new JourneeApiFixture();
  journees.seed(journeeRecue(5, SUIVIS, [], 'PT0S'));
  journees.apresLaCorrection(journeeRecue(5, SUIVIS, [nuitDuLundiAuMardi], 'PT2H'), journeeRecue(6, SUIVIS, [nuitVueDuMardi], 'PT3H30M'));
  journees.seed(journeeRecue(6, SUIVIS, [], 'PT0S'));
  journees.install();
  journees.installAjout();
};

const whenCorrectingTheDayFromTheReport = (): void => {
  cy.viewport(1440, 900);
  cy.clock(HORLOGE, ['Date']);
  cy.visit('/operateurs/op-1/heures?jour=2026-10-05');
  cy.get(dataSelector('synthese-corriger-la-journee')).click();
  cy.location('pathname').should('eq', '/operateurs/op-1/journees/2026-10-05');
  cy.get(dataSelector('corriger-titre')).should('have.text', 'Corriger la journée');
};
const whenAddingTheNightFinishedTheNextDay = (): void => {
  cy.get(dataSelector('activite-ajouter')).click();
  cy.get(dataSelector('ajout-element')).click();
  cy.get(dataSelector('ajout-element-proposition')).contains('OF 24-131 · Pièce 1').click();
  cy.get(dataSelector('ajout-debut')).type('22:00');
  cy.get(dataSelector('ajout-fin')).type('03:30');
  cy.get(dataSelector('ajout-fin')).blur();
  cy.get(dataSelector('ajout-proposition')).click();
  cy.get(dataSelector('ajout-ajouter')).click();
  cy.get(dataSelector('corriger-annonce')).should('have.text', 'Activité ajoutée : 2 h 00 ce lundi, 3 h 30 le mardi 6');
  cy.get(dataSelector('frise-mention')).should('have.text', 'suite le mardi 6 →');
};
const whenOpeningTheNextDayFromTheMessage = (): void => {
  cy.get(dataSelector('corriger-annonce-suite')).should('have.text', 'Voir le mardi 6').click();
};

const thenTheNextDayShowsTheContinuationWithoutTheMessage = (): void => {
  cy.location('pathname').should('eq', '/operateurs/op-1/journees/2026-10-06');
  cy.get(dataSelector('corriger-jour')).should('have.text', 'mardi 6 octobre 2026');
  cy.get(dataSelector('corriger-annonce')).should('not.exist');
  cy.get(dataSelector('frise-operationnel')).should('contain.text', 'Opérationnel : 3 h 30');
  cy.get(dataSelector('frise-mention')).should('have.text', '← début le lundi 5 à 22:00');
  cy.get(dataSelector('activite-horaires')).should('contain.text', '22:00 → 03:30');
};
