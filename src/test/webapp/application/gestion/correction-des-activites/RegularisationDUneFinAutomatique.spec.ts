import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import {
  activiteRecue,
  elementRecu,
  instantLocal,
  JourneeApiFixture,
  journeeRecue,
  suiviRecu,
  tourRecu,
} from '../../../utils/gestion/correction-des-activites/JourneeApiFixture';
import { ParametrageApiFixture } from '../../../utils/gestion/parametrage/ParametrageApiFixture';

type RestRegularisation = components['schemas']['RestRegularisation'];

const HORLOGE = new Date(2026, 9, 6, 10, 0).getTime();
const ELEMENT = elementRecu('1');
const SUIVIS = [suiviRecu('suivi-1', ELEMENT)];

const soir = (fin: string, etat: 'TERMINEE' | 'TERMINEE_AUTOMATIQUEMENT', dureeSurLeJour: string) =>
  activiteRecue({
    id: 'soir',
    suivi: 'suivi-1',
    element: ELEMENT,
    poste: tourRecu,
    debut: instantLocal(5, 18, 30),
    fin,
    etat,
    dureeSurLeJour,
  });

const dossierDuSoir = (): components['schemas']['RestDossierAnomalie'] => ({
  adresse: { suivi: 'suivi-1', pointage: 'soir' },
  elementId: ELEMENT.id,
  designation: 'Pièce 1',
  revision: 3,
  evaluation: instantLocal(6, 10),
  borneDeFin: instantLocal(5, 23),
  activite: {
    evenement: 'soir',
    activite: 'soir',
    operateurId: 'op-1',
    posteId: tourRecu.id,
    categorie: 'TRAVAIL',
    debut: instantLocal(5, 18, 30),
    fin: instantLocal(5, 22, 30),
    duree: 'PT4H',
  },
  pointages: [
    {
      id: 'soir',
      type: 'DEBUT',
      activite: 'soir',
      operateurId: 'op-1',
      posteId: tourRecu.id,
      auteur: 'hugo',
      dateDeSurvenue: instantLocal(5, 18, 30),
      dateDEnregistrement: instantLocal(5, 18, 30),
      estUneRegularisation: false,
    },
  ],
});

describe('Regularisation of an automatic end from the day to correct', () => {
  it('should place the end on the frise, validate it and show the day corrected', () => {
    givenADayWithAnAutomaticEnd();

    whenOpeningTheDay();
    whenPlacingTheEndOnTheBoundAndValidating();

    thenTheEndSentIsTheBound();
    thenTheDayIsReadAgainWithTheEndRegularised();
  });

  it('should keep the panel open and explain why the server refuses the end', () => {
    givenADayWithAnAutomaticEnd('fin-apres-borne');

    whenOpeningTheDay();
    whenPlacingTheEndOnTheBoundAndValidating();

    thenTheRefusalIsExplained();
  });
});

const givenADayWithAnAutomaticEnd = (refus?: string): void => {
  new ParametrageApiFixture().install();
  const journees = new JourneeApiFixture();
  journees.seed(journeeRecue(5, SUIVIS, [soir(instantLocal(5, 22, 30), 'TERMINEE_AUTOMATIQUEMENT', 'PT4H')], 'PT4H'));
  journees.apresLaCorrection(journeeRecue(5, SUIVIS, [soir(instantLocal(5, 23), 'TERMINEE', 'PT4H30M')], 'PT4H30M'));
  journees.seedDossier(dossierDuSoir());
  journees.refusDeLaRegularisation = refus;
  journees.install();
  journees.installDossier();
  journees.installRegularisation();
};

const whenOpeningTheDay = (): void => {
  cy.viewport(1440, 900);
  cy.clock(HORLOGE, ['Date']);
  cy.visit('/operateurs/op-1/journees/2026-10-05');
  cy.get(dataSelector('activite-etat')).should('have.text', 'fin automatique');
};

const whenPlacingTheEndOnTheBoundAndValidating = (): void => {
  cy.get(dataSelector('activite-regulariser')).click();
  cy.get(dataSelector('regularisation-titre')).should('have.text', 'Régulariser la fin');
  cy.get(dataSelector('regularisation-poignee')).focus();
  cy.get(dataSelector('regularisation-poignee')).type('{end}');
  cy.get(dataSelector('regularisation-valider')).should('contain.text', 'Valider la fin à 23:00').click();
};

const thenTheEndSentIsTheBound = (): void => {
  cy.wait('@regularisationWrite').then(envoi => {
    const corps = envoi.request.body as RestRegularisation;
    expect(corps.activite).to.equal('soir');
    expect(Date.parse(corps.dateDeSurvenue)).to.equal(Date.parse(instantLocal(5, 23)));
  });
};

const thenTheDayIsReadAgainWithTheEndRegularised = (): void => {
  cy.get(dataSelector('corriger-annonce')).should('have.text', 'Fin régularisée');
  cy.get(dataSelector('regularisation-panneau')).should('not.exist');
  cy.get(dataSelector('activite-horaires')).should('have.text', '18:30 → 23:00');
  cy.get(dataSelector('activite-etat')).should('not.exist');
  cy.get(dataSelector('activite-regulariser')).should('not.exist');
};

const thenTheRefusalIsExplained = (): void => {
  cy.get(dataSelector('regularisation-refus')).should('have.text', 'La fin dépasse le démarrage suivant ou la clôture de l’élément.');
  cy.get(dataSelector('regularisation-panneau')).should('exist');
};
