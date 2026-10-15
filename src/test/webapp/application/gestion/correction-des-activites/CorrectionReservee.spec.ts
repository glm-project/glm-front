import { dataSelector } from '../../../utils/DataSelector';
import type {} from '../../../utils/gestion/authentication/RolesFixture';
import { JourneeApiFixture, journeeRecue } from '../../../utils/gestion/correction-des-activites/JourneeApiFixture';
import { ParametrageApiFixture } from '../../../utils/gestion/parametrage/ParametrageApiFixture';
import { SupervisionApiFixture } from '../../../utils/gestion/supervision-atelier/SupervisionApiFixture';

const ADDRESS = '/operateurs/op-1/journees/2026-10-05';
const HORLOGE = new Date(2026, 9, 6, 10, 0).getTime();

describe('Correction of the day reserved to the gestionnaire', () => {
  beforeEach(() => {
    new SupervisionApiFixture().intercept();
    new ParametrageApiFixture().install();
    const journees = new JourneeApiFixture();
    journees.seed(journeeRecue(5, [], []));
    journees.install();
  });

  it('should open the page for a gestionnaire', () => {
    whenOpeningTheAddressWithRoles(undefined);

    thenThePageToCorrectTheDayIsShown();
  });

  const whenOpeningTheAddressWithRoles = (roles: readonly string[] | undefined): void => {
    cy.viewport(1440, 900);
    cy.clock(HORLOGE, ['Date']);
    cy.visit(ADDRESS, {
      onBeforeLoad: window => {
        if (roles !== undefined) window.gestionRolesFixture = roles;
      },
    });
  };

  const thenThePageToCorrectTheDayIsShown = (): void => {
    cy.get(dataSelector('corriger-titre')).should('have.text', 'Corriger la journée');
    cy.location('pathname').should('eq', ADDRESS);
  };
});
