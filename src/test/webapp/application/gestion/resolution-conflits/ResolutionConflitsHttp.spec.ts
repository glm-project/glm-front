import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';

const suiviFixture = '70000000-0000-0000-0000-000000000001';
const finFixture = '70000000-0000-0000-0000-000000000002';
const operateurFixture = '70000000-0000-0000-0000-000000000003';
const elementFixture = '70000000-0000-0000-0000-000000000004';
const ligneFixture: components['schemas']['RestConflitEnListe'] = {
  adresse: { suivi: suiviFixture, pointage: finFixture },
  revision: 3,
  elementId: elementFixture,
  designation: 'M-042 réel',
  operateurId: operateurFixture,
  datePremierPointage: '2026-09-14T08:00:00.123456789+02:00',
  nombrePointages: 3,
};

describe('HTTP conflict resolution in Gestion', () => {
  it('should load the authoritative conflict list through the production HTTP composition', () => {
    givenACompleteConflictList();

    whenVisitingRealConflicts();

    thenTheRealConflictListIsVisible();
  });

  const givenACompleteConflictList = (): void => {
    cy.intercept('GET', '/api/atelier/conflits*', {
      body: { lignes: [ligneFixture], total: 1, complete: true, page: 0, size: 5 } satisfies components['schemas']['RestPageDesConflits'],
    }).as('conflitsReels');
  };

  const whenVisitingRealConflicts = (): void => {
    cy.visit('/conflits', {
      onBeforeLoad: window => {
        Object.assign(window, { gestionConflitsSource: 'HTTP' });
      },
    });
  };

  const thenTheRealConflictListIsVisible = (): void => {
    cy.wait('@conflitsReels');
    cy.get(dataSelector('conflits-demo')).should('not.exist');
    cy.get(dataSelector('conflit-ligne')).should('have.length', 1).and('contain.text', 'M-042 réel');
    cy.get(dataSelector('conflit-ligne')).should('contain.text', 'Opérateur non résolu').and('contain.text', operateurFixture);
  };
});
