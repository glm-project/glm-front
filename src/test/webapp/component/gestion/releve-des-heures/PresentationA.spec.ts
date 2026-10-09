import { dataSelector } from '../../../utils/DataSelector';
import { CoutDeRevientApiFixture } from '../../../utils/gestion/cout-de-revient/CoutDeRevientApiFixture';
import { ElementsApiFixture, elementsFixture } from '../../../utils/gestion/element-de-fabrication/ElementsApiFixture';
import { OperateursApiFixture, operateursFixture } from '../../../utils/gestion/operateur/OperateursApiFixture';
import { PostesApiFixture, postesFixture } from '../../../utils/gestion/poste/PostesApiFixture';
import {
  feuilleFixture,
  SyntheseDesHeuresApiFixture,
  syntheseFixture,
} from '../../../utils/gestion/releve-des-heures/SyntheseDesHeuresApiFixture';
import { SupervisionApiFixture, supervisionFixture } from '../../../utils/gestion/supervision-atelier/SupervisionApiFixture';
import { requiredFixture } from '../../../utils/RequiredFixture';

const ROUTES = [
  ['heures', '/operateurs/op-1/heures?annee=2026&semaine=38&jour=2026-09-18', 'synthese-detail-jour'],
  ['supervision', '/', 'supervision-plateau'],
  ['references', '/produits', 'element-row'],
  ['operateurs', '/operateurs', 'operateur-row'],
  ['postes', '/postes-de-travail', 'poste-row'],
  ['couts', '/couts-de-revient/element-1', 'cout-total'],
] as const;

const totalFixture = (valeur: string): { valeur: string } => ({ valeur });
const instantFixture = (day: number, hour: number): string => new Date(2026, 8, day, hour).toISOString();

const givenRepresentativeReadings = (): void => {
  const heures = new SyntheseDesHeuresApiFixture();
  const synthese = syntheseFixture(2026, 38);
  const feuille = feuilleFixture(2026, 38);
  const elements = elementsFixture(6);
  const jour = '2026-09-18';
  heures.seed({
    synthese: {
      ...synthese,
      dureeOperationnelleTotale: totalFixture('PT13H'),
      elements: synthese.elements.map(element => ({
        ...element,
        reference: 'M24-0655',
        description: 'Support latéral pour carter de transmission',
        duree: totalFixture('PT13H'),
      })),
      jours: requiredFixture(synthese.jours, 'jours de synthèse').map(value => ({
        ...value,
        pointages:
          value.jour === jour ? [{ id: 'debut-auto', type: 'DEBUT', dateDeSurvenue: instantFixture(18, 8), element: 'element-1' }] : [],
        dureeOperationnelle: totalFixture(value.jour === jour ? 'PT13H' : 'PT0S'),
      })),
    },
    feuille: {
      ...feuille,
      jours: requiredFixture(feuille.jours, 'jours de feuille').map(value => ({
        ...value,
        activites:
          value.jour === jour
            ? [
                {
                  element: 'element-1',
                  categorie: 'TRAVAIL',
                  debut: instantFixture(18, 8),
                  fin: instantFixture(18, 21),
                  activite: {
                    id: 'debut-auto',
                    debut: instantFixture(18, 8),
                    fin: instantFixture(18, 21),
                    etat: 'TERMINEE_AUTOMATIQUEMENT',
                  },
                },
              ]
            : [],
      })),
    },
  });
  heures.install();
  new CoutDeRevientApiFixture().install();
  new ElementsApiFixture(
    elements.map((element, index) =>
      index === 0 ? { ...element, reference: 'M24-0655', description: 'Support latéral pour carter de transmission' } : element,
    ),
  ).install();
  new OperateursApiFixture(operateursFixture(8), postesFixture(6)).install();
  new PostesApiFixture(postesFixture(6)).install();
  const supervision = supervisionFixture();
  new SupervisionApiFixture({
    ...supervision,
    activites: supervision.activites.filter(activite => activite.etat === 'TERMINEE_AUTOMATIQUEMENT'),
  }).intercept();
};

for (const width of [1440, 390]) {
  describe(`Consultation surfaces at ${width}px`, () => {
    for (const [name, route, ready] of ROUTES) {
      it(`should keep the ${name} reading within the available viewport`, () => {
        givenRepresentativeReadings();

        whenCapturingReading(width, name, route, ready);

        thenThePageHasNoHorizontalOverflow();
      });
    }
  });
}

const whenCapturingReading = (width: number, name: string, route: string, ready: string): void => {
  cy.viewport(width, width === 390 ? 844 : 1000);
  cy.visit(route);
  cy.get(dataSelector(ready)).should('exist');
  if (name === 'heures') {
    cy.get(dataSelector('selecteur-operateur')).should('be.enabled');
  }
  cy.screenshot(`A-${name}-${width}`, { capture: 'viewport' });
  if (name === 'heures') {
    cy.get(dataSelector('synthese-detail-jour')).scrollIntoView();
    cy.screenshot(`A-${name}-detail-${width}`, { capture: 'viewport' });
  }
};
const thenThePageHasNoHorizontalOverflow = (): void => {
  cy.document().should(document => {
    expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth);
  });
};
