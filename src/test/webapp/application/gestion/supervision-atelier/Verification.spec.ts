import { dataSelector } from '../../../utils/DataSelector';
import { OperateursApiFixture } from '../../../utils/gestion/operateur/OperateursApiFixture';
import {
  feuilleFixture,
  SyntheseDesHeuresApiFixture,
  syntheseFixture,
} from '../../../utils/gestion/releve-des-heures/SyntheseDesHeuresApiFixture';
import { SupervisionApiFixture, supervisionFixture } from '../../../utils/gestion/supervision-atelier/SupervisionApiFixture';

it('should open the automatic finish in the responsible operator report on its actual day', () => {
  givenAnAutomaticFinishAndAvailableReport();

  whenOpeningTheAnomaly();

  thenTheResponsiblePersonAndDayAreConsulted();
});

it('should investigate a conflict on its activity day even when the workshop is observed in another week', () => {
  givenAConflictFromThePreviousWeek();

  whenOpeningTheDatedConflict();

  thenTheConflictPersonAndDayAreConsulted();
});

const givenAConflictFromThePreviousWeek = (): void => {
  const supervision = supervisionFixture();
  new SupervisionApiFixture({
    ...supervision,
    sequencesEnConflit: supervision.sequencesEnConflit.map(sequence => ({
      ...sequence,
      activites: sequence.activites.map(activite => ({
        ...activite,
        debut: new Date(2026, 8, 16, 19, 10).toISOString(),
        echeance: new Date(2026, 8, 17, 8, 10).toISOString(),
      })),
    })),
  }).intercept();
  new OperateursApiFixture([{ id: 'op-morel', nom: 'Morel', prenom: 'Inès', postes: [], natures: [] }]).install();
  const report = new SyntheseDesHeuresApiFixture();
  const operateur = { id: 'op-morel', nom: 'Morel', prenom: 'Inès' };
  report.seed({ synthese: { ...syntheseFixture(2026, 38), operateur }, feuille: { ...feuilleFixture(2026, 38), operateur } });
  report.install();
};
const whenOpeningTheDatedConflict = (): void => {
  cy.visit('/');
  cy.get('[data-operateur-id="op-morel"]').find(dataSelector('supervision-conflit-lien')).should('not.exist');
  cy.get('[data-operateur-id="op-morel"]').find(dataSelector('supervision-conflit-activite-lien')).click();
};
const thenTheConflictPersonAndDayAreConsulted = (): void => {
  cy.location('pathname').should('equal', '/operateurs/op-morel/heures');
  cy.location('search').should('contain', 'annee=2026').and('contain', 'semaine=38').and('contain', 'jour=2026-09-16');
  cy.get(dataSelector('synthese-identite')).should('contain.text', 'Inès MOREL');
  cy.get(dataSelector('synthese-journal-titre')).should('contain.text', 'mercredi 16 septembre');
};

const givenAnAutomaticFinishAndAvailableReport = (): void => {
  new SupervisionApiFixture().intercept();
  new OperateursApiFixture([{ id: 'op-marchand', nom: 'Marchand', prenom: 'Kevin', postes: [], natures: [] }]).install();
  const report = new SyntheseDesHeuresApiFixture();
  const operateur = { id: 'op-marchand', nom: 'Marchand', prenom: 'Kevin' };
  report.seed({ synthese: { ...syntheseFixture(2026, 39), operateur }, feuille: { ...feuilleFixture(2026, 39), operateur } });
  report.install();
};
const whenOpeningTheAnomaly = (): void => {
  cy.visit('/');
  cy.get(dataSelector('supervision-anomalie')).first().click();
};
const thenTheResponsiblePersonAndDayAreConsulted = (): void => {
  cy.location('pathname').should('equal', '/operateurs/op-marchand/heures');
  cy.location('search').should('contain', 'annee=2026').and('contain', 'semaine=39').and('contain', 'jour=2026-09-24');
  cy.get(dataSelector('synthese-identite')).should('contain.text', 'Kevin MARCHAND');
  cy.get(dataSelector('synthese-journal-titre')).should('contain.text', 'jeudi 24 septembre');
};
