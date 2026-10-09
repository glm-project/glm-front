import { components } from '@/app/generated/schema';
import { suiviFinAutomatiqueFixture } from './FinAutomatiqueHttp.fixture';

type RestRegularisation = components['schemas']['RestRegularisation'];

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

export const givenTheRegularisationFailsOnceThenIsCreated = (): void => {
  const envoyees: RestRegularisation[] = [];
  cy.wrap(envoyees).as('regularisationsEnvoyees');
  cy.intercept('POST', urlRegularisation, request => {
    envoyees.push(request.body as RestRegularisation);
    request.reply(envoyees.length === 1 ? { statusCode: 500, body: {} } : { statusCode: 201, body: {} });
  }).as('regularisation');
};

export const thenTheRegularisationSentIs = (activite: string, dateDeSurvenue: string): void => {
  cy.wait('@regularisation').then(envoi => {
    const corps = envoi.request.body as RestRegularisation;
    expect(corps).to.deep.equal({ id: corps.id, activite, dateDeSurvenue });
    expect(corps.id).to.match(/^[0-9a-f-]{36}$/);
  });
};

export const thenTheRegularisationsSentCarryTheSameIdentifier = (): void => {
  cy.get<RestRegularisation[]>('@regularisationsEnvoyees').should(envoyees => {
    expect(envoyees).to.have.length(2);
    expect(envoyees[0]?.id).to.equal(envoyees[1]?.id);
  });
};
