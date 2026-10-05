import { ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { dataSelector } from '../../../utils/DataSelector';
import { longPressFixture } from '../../../utils/LongPressFixture';
import { clearPupitreStorageFixture, givenEnrolledPupitreFixture } from '../../../utils/PupitreStorageFixture';

const entrepriseFixture = 'entreprise-a';
const referentielFixture: ReferentielDuPupitre = {
  operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', identifiant: '049', postes: [] }],
  suivis: [
    {
      conflits: [],
      id: 'piece-1',
      nom: '204',
      etat: 'EN_ATTENTE',
      type: 'ORDRE_DE_FABRICATION',
      activites: [],
      evenements: [],
    },
  ],
};

const SEMAINE_EN_COURS = 38;
const LUNDI_EN_COURS = 14;

const lundiDe = (semaine: number): number => LUNDI_EN_COURS - 7 * (SEMAINE_EN_COURS - semaine);
const joursDe = (semaine: number): string[] =>
  Array.from({ length: 7 }, (_, rang) => `2026-09-${String(lundiDe(semaine) + rang).padStart(2, '0')}`);
const instantDe = (semaine: number, heure: number, minute = 0): string => new Date(2026, 8, lundiDe(semaine), heure, minute).toISOString();

const syntheseFixture = (semaine: number, evaluation: string) => ({
  annee: 2026,
  semaine,
  operateur: { id: 'jean', nom: 'Dupont', prenom: 'Jean' },
  evaluation,
  dureeOperationnelleTotale: { complete: true, valeur: 'PT7H45M' },
  conflits: [],
  elements: [
    {
      id: 'of-1',
      type: 'ORDRE_DE_FABRICATION',
      nom: 'OF-2026-001240',
      reference: String(1202 + semaine),
      duree: { complete: true, valeur: 'PT7H45M' },
      dureeNonConformite: { complete: true, valeur: 'PT0S' },
      postes: [{ poste: { id: 'fraiseuse', libelle: 'Fraiseuse' }, nature: 'Fraisage' }],
    },
  ],
  jours: joursDe(semaine).map((jour, rang) => ({
    jour,
    dureeOperationnelle: { complete: true, valeur: rang === 0 ? 'PT7H45M' : 'PT0S' },
  })),
});

const feuilleFixture = (semaine: number, evaluation: string) => ({
  annee: 2026,
  semaine,
  operateur: { id: 'jean', nom: 'Dupont', prenom: 'Jean' },
  evaluation,
  jours: joursDe(semaine).map((jour, rang) => ({
    jour,
    activites:
      rang === 0
        ? [
            {
              element: 'of-1',
              poste: 'fraiseuse',
              nature: 'Fraisage',
              categorie: 'TRAVAIL',
              debut: instantDe(semaine, 7),
              fin: instantDe(semaine, 14, 45),
              activite: { id: `debut-${String(semaine)}`, debut: instantDe(semaine, 7), fin: instantDe(semaine, 14, 45), etat: 'TERMINEE' },
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

  it('should detail a day of the previous week', () => {
    givenAnEnrolledPupitreWithOperator049();
    whenDesignatingOperator049();
    whenOpeningMyPointages();

    whenGoingBackOneWeek();
    whenChoosingDay('jour-2026-09-07');

    thenThePreviousWeekDayIsDetailed();
  });

  it('should reach a week through the month chooser', () => {
    givenAnEnrolledPupitreWithOperator049();
    whenDesignatingOperator049();
    whenOpeningMyPointages();

    whenChoosingWeekThroughMonth('annee-2026', 'mois-2026-9', 'semaine-2026-37');

    thenThePreviousWeekDayIsDetailed();
  });

  it('should keep my pointages out of reach once the server cannot be reached', () => {
    givenAnEnrolledPupitreWithOperator049();
    whenDesignatingOperator049();

    whenAPointageCannotReachTheServer();

    thenMyPointagesAreUnavailableOffline();
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
      body: {
        genereLe: '2026-09-17T05:00:00Z',
        operateurs: referentielFixture.operateurs,
        suivis: [{ id: 'piece-1', nom: '204', etat: 'EN_ATTENTE', type: 'ORDRE_DE_FABRICATION', activites: [], conflits: [] }],
      },
    }).as('workshop');
    cy.intercept('GET', '/api/syntheses-des-heures/jean*', request => {
      request.reply({ body: syntheseFixture(Number(request.query['semaine']), String(request.query['evaluation'])) });
    }).as('synthese');
    cy.intercept('GET', '/api/feuilles-de-temps/jean*', request => {
      request.reply({ body: feuilleFixture(Number(request.query['semaine']), String(request.query['evaluation'])) });
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

  const whenAPointageCannotReachTheServer = (): void => {
    cy.intercept('POST', '/api/atelier/suivis/*/pointages', { forceNetworkError: true }).as('pointage');
    longPressFixture(cy.get(dataSelector('tile-piece-1')).find(dataSelector('primary-target')));
    cy.wait('@pointage');
    cy.get(dataSelector('pupitre-disconnected')).should('be.visible');
  };

  const whenOpeningMyPointages = (): void => {
    cy.get(dataSelector('show-mes-pointages')).click();
    cy.get(dataSelector('mes-pointages')).should('be.visible');
  };

  const whenGoingBackOneWeek = (): void => {
    cy.get(dataSelector('semaine-precedente')).click();
    cy.get(dataSelector('semaine-titre')).should('contain.text', 'Semaine 37');
  };

  const whenChoosingWeekThroughMonth = (annee: string, mois: string, semaine: string): void => {
    cy.get(dataSelector('choisir-une-semaine')).click();
    cy.get(dataSelector(annee)).click();
    cy.get(dataSelector(mois)).click();
    cy.get(dataSelector(semaine)).click();
    cy.get(dataSelector('choix-de-semaine')).should('not.exist');
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
    cy.get(dataSelector('jour-titre')).should('contain.text', 'Lundi 14 septembre 2026');
    cy.get(dataSelector('lignes')).should('contain.text', '1240').and('contain.text', 'Fraiseuse').and('contain.text', '07:00 → 14:45');
  };

  const thenThePreviousWeekDayIsDetailed = (): void => {
    cy.get(dataSelector('jour-titre')).should('contain.text', 'Lundi 7 septembre 2026');
    cy.get(dataSelector('lignes')).should('contain.text', '1239').and('contain.text', '07:00 → 14:45');
  };

  const thenMyPointagesAreUnavailableOffline = (): void => {
    cy.get(dataSelector('show-mes-pointages')).should('be.disabled');
    cy.get(dataSelector('mes-pointages-indisponible')).should('contain.text', 'Disponible uniquement en ligne');
  };

  const thenThePointageScreenIsShown = (): void => {
    cy.get(dataSelector('mes-pointages')).should('not.exist');
    cy.get(dataSelector('pointage')).should('be.visible');
  };
});
