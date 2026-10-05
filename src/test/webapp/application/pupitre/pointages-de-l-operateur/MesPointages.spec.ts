import { ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { dataSelector } from '../../../utils/DataSelector';
import { clearPupitreStorageFixture, givenEnrolledPupitreFixture } from '../../../utils/PupitreStorageFixture';

const entrepriseFixture = 'entreprise-a';
const referentielFixture: ReferentielDuPupitre = {
  operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', identifiant: '049', postes: [] }],
  suivis: [],
};

describe('Pupitre my pointages journey', () => {
  afterEach(() => {
    clearPupitreStorageFixture();
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
      body: { genereLe: '2026-10-08T05:00:00Z', operateurs: referentielFixture.operateurs, suivis: [] },
    }).as('workshop');
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

  const thenThePointageScreenIsShown = (): void => {
    cy.get(dataSelector('mes-pointages')).should('not.exist');
    cy.get(dataSelector('pointage')).should('be.visible');
  };
});
