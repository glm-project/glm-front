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
  elements: [
    {
      id: 'of-1',
      type: 'ORDRE_DE_FABRICATION',
      nom: 'OF-2026-001240',
      reference: '1240',
      duree: { complete: true, valeur: 'PT7H45M' },
      dureeNonConformite: { complete: true, valeur: 'PT0S' },
      postes: [{ poste: { id: 'fraiseuse', libelle: 'Fraiseuse' }, nature: 'Fraisage' }],
    },
  ],
  jours: ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20'].map((jour, rang) => ({
    jour,
    dureeOperationnelle: { complete: true, valeur: rang === 0 ? 'PT7H45M' : 'PT0S' },
    pointages:
      rang === 0 ? [{ id: 'debut-1', type: 'DEBUT', intention: 'OUVERTURE', dateDeSurvenue: `${jour}T05:00:00Z`, element: 'of-1' }] : [],
  })),
});

const feuilleFixture = (evaluation: string) => ({
  annee: 2026,
  semaine: 38,
  operateur: { id: 'jean', nom: 'Dupont', prenom: 'Jean' },
  evaluation,
  jours: ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20'].map((jour, rang) => ({
    jour,
    activites:
      rang === 0
        ? [
            {
              element: 'of-1',
              poste: 'fraiseuse',
              nature: 'Fraisage',
              categorie: 'TRAVAIL',
              debut: new Date(2026, 8, 14, 7).toISOString(),
              fin: new Date(2026, 8, 14, 14, 45).toISOString(),
              activite: {
                id: 'debut-1',
                debut: new Date(2026, 8, 14, 7).toISOString(),
                fin: new Date(2026, 8, 14, 14, 45).toISOString(),
                etat: 'TERMINEE',
              },
            },
          ]
        : [],
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

  it('should detail a clocked day chosen in the current week', () => {
    givenAnEnrolledPupitreWithOperator049();
    whenDesignatingOperator049();
    whenOpeningMyPointages();

    whenChoosingDay('jour-2026-09-14');

    thenTheChosenDayIsDetailed();
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
    cy.intercept('GET', '/api/feuilles-de-temps/jean*', request => {
      request.reply({ body: feuilleFixture(String(request.query['evaluation'])) });
    }).as('feuille');
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

  const whenChoosingDay = (selector: string): void => {
    cy.get(dataSelector(selector)).click();
  };

  const whenReturningToPointage = (): void => {
    cy.get(dataSelector('retour-au-pointage')).click();
  };

  const thenTheCurrentWeekIsShown = (): void => {
    cy.wait('@synthese').its('request.query').should('include', { annee: '2026', semaine: '38' });
    cy.get(dataSelector('total-semaine')).should('have.text', '7 h 45');
    cy.get(dataSelector('jour-2026-09-14')).should('contain.text', 'Lun. 14 sept.');
  };

  const thenTheChosenDayIsDetailed = (): void => {
    cy.get(dataSelector('jour-titre')).should('have.text', 'Lundi 14 septembre 2026');
    cy.get(dataSelector('lignes')).should('contain.text', '1240').and('contain.text', 'Fraiseuse').and('contain.text', '07:00 → 14:45');
  };

  const thenThePointageScreenIsShown = (): void => {
    cy.get(dataSelector('mes-pointages')).should('not.exist');
    cy.get(dataSelector('pointage')).should('be.visible');
  };
});
