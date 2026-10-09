import { dataSelector } from '../../DataSelector';
import { suiviFinAutomatiqueFixture } from './FinAutomatiqueHttp.fixture';

interface CorpsDeRegularisation {
  readonly id: string;
  readonly activite: string;
  readonly dateDeSurvenue: string;
}

const urlRegularisation = `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/regularisations`;

export const givenTheRegularisationIsCreated = (): void => {
  cy.intercept('POST', urlRegularisation, { statusCode: 201, body: {} }).as('regularisation');
};

export const givenTheRegularisationIsRefusedWith = (statusCode: number, code: string): void => {
  cy.intercept('POST', urlRegularisation, {
    statusCode,
    body: { type: `urn:glm:erreur:atelier:${code}`, message: 'Refus du serveur' },
  }).as('regularisation');
};

const identifiantsEnvoyes: string[] = [];

export const givenTheRegularisationFailsOnceThenIsCreated = (): void => {
  identifiantsEnvoyes.length = 0;
  cy.intercept('POST', urlRegularisation, request => {
    identifiantsEnvoyes.push((request.body as CorpsDeRegularisation).id);
    request.reply(identifiantsEnvoyes.length === 1 ? { statusCode: 500, body: {} } : { statusCode: 201, body: {} });
  }).as('regularisation');
};

export const whenValidatingTheEnd = (): void => {
  cy.get(dataSelector('anomalie-resolution-valider')).click();
};

export const thenTheRegularisationSentIs = (activite: string, dateDeSurvenue: string): void => {
  cy.wait('@regularisation').then(envoi => {
    const corps = envoi.request.body as CorpsDeRegularisation;
    expect(corps).to.deep.equal({ id: corps.id, activite, dateDeSurvenue });
    expect(corps.id).to.match(/^[0-9a-f-]{36}$/);
  });
};

export const thenTheRegularisationsSentCarryTheSameIdentifier = (): void => {
  cy.wrap(identifiantsEnvoyes).should(identifiants => {
    expect(identifiants).to.have.length(2);
    expect(identifiants[0]).to.equal(identifiants[1]);
  });
};

export const thenTheEndIsSaidRegularisedAt = (heure: string): void => {
  cy.get(dataSelector('anomalie-resolution-regularisee')).should('contain.text', `Fin régularisée à ${heure}`);
  cy.get(dataSelector('anomalie-resolution-valider')).should('not.exist');
};

export const thenTheRefusalIsSaid = (message: string): void => {
  cy.get(dataSelector('anomalie-resolution-refus')).should('contain.text', message);
};
