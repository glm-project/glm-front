import { ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { dataSelector } from '../../../utils/DataSelector';
import { clearPupitreStorageFixture, givenEnrolledPupitreFixture } from '../../../utils/PupitreStorageFixture';

const entrepriseFixture = 'entreprise-a';
const referentielFixture: ReferentielDuPupitre = {
  operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', identifiant: '049', postes: [] }],
  suivis: [],
};

const syntheseFixture = (evaluation: string) => ({
  annee: 2026,
  semaine: 38,
  operateur: { id: 'jean', nom: 'Dupont', prenom: 'Jean' },
  evaluation,
  dureeOperationnelleTotale: { complete: true, valeur: 'PT7H45M' },
  conflits: [],
  elements: [],
  jours: ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20'].map((jour, rang) => ({
    jour,
    dureeOperationnelle: { complete: true, valeur: rang === 0 ? 'PT7H45M' : 'PT0S' },
    pointages:
      rang === 0 ? [{ id: 'debut-1', type: 'DEBUT', intention: 'OUVERTURE', dateDeSurvenue: `${jour}T05:00:00Z`, element: 'of-1' }] : [],
  })),
});

describe('Pupitre my pointages journey', () => {
  beforeEach(() => {
    cy.clock(new Date(2026, 8, 17, 14, 20).getTime(), ['Date']);
  });

  afterEach(() => {
    clearPupitreStorageFixture();
  });

  it('should show the current week of the designated operator', () => {
    givenAnEnrolledPupitreWithOperator049();
    whenDesignatingOperator049();

    whenOpeningMyPointages();

    thenTheCurrentWeekIsShown();
  });

  it('should let the designated operator open my pointages and return to the pointage screen', () => {
    givenAnEnrolledPupitreWithOperator049();
    whenDesignatingOperator049();

    whenOpeningMyPointages();
    whenReturningToPointage();

    thenThePointageScreenIsShown();
  });

  const givenAnEnrolledPupitreWithOperator049 = (): void => {
    cy.intercept('POST', '**/protocol/openid-connect/auth/device', { statusCode: 503, body: {} }).as('deviceAuthorization');
    cy.intercept('POST', '**/protocol/openid-connect/token', { statusCode: 503, body: {} });
    cy.intercept('GET', '/api/pupitre/referentiel', {
      body: { genereLe: '2026-09-17T05:00:00Z', operateurs: referentielFixture.operateurs, suivis: [] },
    }).as('workshop');
    cy.intercept('GET', '/api/syntheses-des-heures/jean*', request => {
      request.reply({ body: syntheseFixture(String(request.query['evaluation'])) });
    }).as('synthese');
    cy.visit('/');
    cy.wait('@deviceAuthorization');
    givenEnrolledPupitreFixture({ entreprise: entrepriseFixture, referentiel: referentielFixture });
    cy.reload();
    cy.wait('@workshop');
    cy.get(dataSelector('designation')).should('be.visible');
  };

  const whenDesignatingOperator049 = (): void => {
    for (const digit of ['0', '4', '9']) cy.get(dataSelector(`digit-${digit}`)).click();
    cy.get(dataSelector('validate')).click();
    cy.get(dataSelector('pointage')).should('be.visible');
  };

  const whenOpeningMyPointages = (): void => {
    cy.get(dataSelector('show-mes-pointages')).click();
    cy.get(dataSelector('mes-pointages')).should('be.visible');
  };

  const whenReturningToPointage = (): void => {
    cy.get(dataSelector('retour-au-pointage')).click();
  };

  const thenTheCurrentWeekIsShown = (): void => {
    cy.wait('@synthese').its('request.query').should('include', { annee: '2026', semaine: '38' });
    cy.get(dataSelector('total-semaine')).should('have.text', '7 h 45');
    cy.get(dataSelector('jour-2026-09-14')).should('contain.text', 'Lun. 14 sept.');
  };

  const thenThePointageScreenIsShown = (): void => {
    cy.get(dataSelector('mes-pointages')).should('not.exist');
    cy.get(dataSelector('pointage')).should('be.visible');
  };
});
