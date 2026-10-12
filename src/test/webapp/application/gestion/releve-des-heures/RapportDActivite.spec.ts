import { dataSelector } from '../../../utils/DataSelector';
import { OperateursApiFixture, operateursFixture, postesFixture } from '../../../utils/gestion/operateur/OperateursApiFixture';
import { SupervisionApiFixture } from '../../../utils/gestion/supervision-atelier/SupervisionApiFixture';

describe('Activity report of an operator in gestion', () => {
  beforeEach(() => new SupervisionApiFixture().intercept());

  it('should summarise the current week of an operator and download its workbook', () => {
    givenOperateurWithActivity();
    whenVisitingOperateurs();
    whenOpeningTheReportOfTheFirstOperateur();
    whenDownloadingTheWorkbook();

    thenTheWeekIsSummarised();
    thenTheWorkbookOfTheWeekWasRequested();
  });
});

const givenOperateurWithActivity = (): void => {
  new OperateursApiFixture(operateursFixture(1), postesFixture(1)).install();
  cy.intercept(
    { method: 'GET', pathname: '/api/syntheses-des-heures/operateur-1/rapport' },
    {
      body: {
        operateur: { id: 'operateur-1', nom: 'Nom 01', prenom: 'Prenom 1' },
        premierJour: '2026-09-14',
        dernierJour: '2026-09-20',
        evaluation: '2026-09-17T08:00:00Z',
        tempsPointe: { valeur: 'PT47H45M' },
        dureeNonConformite: { valeur: 'PT2H40M' },
        joursAvecPointage: 6,
        pointages: 23,
        finsAutomatiques: 1,
      },
    },
  ).as('resume');
  cy.intercept(
    { method: 'GET', pathname: '/api/syntheses-des-heures/operateur-1/export.xlsx' },
    {
      body: 'classeur',
      headers: { 'Content-Disposition': 'attachment; filename="activite-nom-01-prenom-1-S38-2026.xlsx"' },
    },
  ).as('classeur');
};

const whenVisitingOperateurs = (): void => {
  cy.clock(new Date(2026, 8, 17, 10, 0).getTime(), ['Date']);
  cy.viewport(1280, 900);
  cy.visit('/operateurs');
};
const whenOpeningTheReportOfTheFirstOperateur = (): void => {
  cy.get(dataSelector('operateur-rapport')).first().click();
  cy.wait('@resume');
};
const whenDownloadingTheWorkbook = (): void => {
  cy.get(dataSelector('rapport-export-excel')).should('be.enabled').click();
  cy.wait('@classeur').its('request.url').as('urlDuClasseur', { type: 'static' });
};

const thenTheWeekIsSummarised = (): void => {
  cy.get(dataSelector('rapport-periode')).should('contain.text', 'Semaine 38');
  cy.get(dataSelector('rapport-resume')).should('have.text', '6 jours avec pointage · 47 h 45 pointées');
  cy.get(dataSelector('rapport-anomalies')).should('have.attr', 'href', '/anomalies?operateur=operateur-1');
};
const thenTheWorkbookOfTheWeekWasRequested = (): void => {
  cy.get('@urlDuClasseur').should('contain', 'annee=2026').and('contain', 'semaine=38');
  cy.get(dataSelector('rapport-export-echec')).should('not.exist');
};
