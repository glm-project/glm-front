import { dataSelector } from '../../../utils/DataSelector';
import { OperateursApiFixture } from '../../../utils/gestion/operateur/OperateursApiFixture';
import {
  feuilleFixture,
  SyntheseDesHeuresApiFixture,
  syntheseFixture,
} from '../../../utils/gestion/releve-des-heures/SyntheseDesHeuresApiFixture';
import { SupervisionApiFixture } from '../../../utils/gestion/supervision-atelier/SupervisionApiFixture';

it('should open the automatic finish in the responsible operator report on its actual day', () => {
  givenAnAutomaticFinishAndAvailableReport();

  whenOpeningTheAnomaly();

  thenTheResponsiblePersonAndDayAreConsulted();
});

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
