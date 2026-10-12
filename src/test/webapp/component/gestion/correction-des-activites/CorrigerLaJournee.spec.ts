import { dataSelector } from '../../../utils/DataSelector';
import {
  activiteRecue,
  elementRecu,
  fraiseuseRecue,
  instantLocal,
  JourneeApiFixture,
  journeeRecue,
  suiviRecu,
  tourRecu,
} from '../../../utils/gestion/correction-des-activites/JourneeApiFixture';
import { ParametrageApiFixture } from '../../../utils/gestion/parametrage/ParametrageApiFixture';
import { SyntheseDesHeuresApiFixture } from '../../../utils/gestion/releve-des-heures/SyntheseDesHeuresApiFixture';

const HORLOGE = new Date(2026, 9, 6, 10, 0).getTime();
const ELEMENT = elementRecu('1');
const AUTRE_ELEMENT = elementRecu('2', 'MOULE');
const SUIVIS = [suiviRecu('suivi-1', ELEMENT), suiviRecu('suivi-2', AUTRE_ELEMENT, instantLocal(5, 11))];

const matin = activiteRecue({
  id: 'matin',
  suivi: 'suivi-1',
  element: ELEMENT,
  poste: tourRecu,
  debut: instantLocal(5, 8),
  fin: instantLocal(5, 9, 30),
  etat: 'TERMINEE',
  dureeSurLeJour: 'PT1H30M',
});

const soirNonConforme = activiteRecue({
  id: 'soir',
  suivi: 'suivi-1',
  element: ELEMENT,
  poste: fraiseuseRecue,
  categorie: 'NON_CONFORMITE',
  debut: instantLocal(5, 18, 30),
  fin: instantLocal(5, 21, 45),
  etat: 'TERMINEE',
  dureeSurLeJour: 'PT3H15M',
});

const lundi = (activites = [matin, soirNonConforme], operationnelle = 'PT4H45M') => journeeRecue(5, SUIVIS, activites, operationnelle);

const nuitDuLundiAuMardi = activiteRecue({
  id: 'nuit',
  suivi: 'suivi-1',
  element: ELEMENT,
  poste: tourRecu,
  debut: instantLocal(5, 22),
  fin: instantLocal(6, 3, 30),
  etat: 'TERMINEE',
  dureeSurLeJour: 'PT2H',
  autresJours: [{ jour: '2026-10-06', duree: 'PT3H30M' }],
});

describe('Correction of the day of an operator in gestion', () => {
  let journees: JourneeApiFixture;
  let releve: SyntheseDesHeuresApiFixture;

  beforeEach(() => {
    journees = new JourneeApiFixture();
    releve = new SyntheseDesHeuresApiFixture();
  });

  [
    { cas: 'is malformed', jour: 'lundi' },
    { cas: 'is not on the calendar', jour: '2026-02-30' },
    { cas: 'is after today', jour: '2026-10-07' },
  ].forEach(({ cas, jour }) => {
    it(`should send an address whose day ${cas} back to the report of the operator`, () => {
      givenTheReport();
      whenVisiting(`/operateurs/op-1/journees/${jour}`);

      thenTheReportOfTheOperatorIsShownWithoutReadingTheDay();
    });
  });

  it('should say the operator is unknown without reporting a technical failure', () => {
    const reportedErrors: string[] = [];
    givenAnUnknownOperateur();
    whenVisitingRecording('/operateurs/op-1/journees/2026-10-05', reportedErrors);

    thenTheOperatorIsSaidUnknownWithoutAnyTechnicalReport(reportedErrors);
  });

  it('should show the day received: activities, hours, workstations, types, durations and operational time', () => {
    givenTheDay(lundi());
    whenVisiting('/operateurs/op-1/journees/2026-10-05');

    thenTheDayReceivedIsShown();
  });

  it('should offer a retry after a read failure', () => {
    givenAFailingRead();
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenTheServerRecoversAndTheReadIsRetried(lundi());

    thenTheDayReceivedIsShown();
  });

  it('should open the next day from the arrow and offer none after today', () => {
    givenTheDays(lundi(), journeeRecue(6, SUIVIS, []));
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenOpeningTheNextDay();

    thenTheDayOfTheSixthIsShownWithoutNextDay();
  });

  it('should open the day a crossing activity ends on', () => {
    givenTheDays(lundi([nuitDuLundiAuMardi]), journeeRecue(6, SUIVIS, []));
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenOpeningTheLinkToTheEndOfTheActivity();

    thenTheDayOfTheSixthIsShown();
  });

  it('should tell an activity in progress from an automatic end', () => {
    givenTheDay(lundi([enCoursDepuisMidi, finAutomatiqueDuMatin]));
    whenVisiting('/operateurs/op-1/journees/2026-10-05');

    thenTheActivityInProgressIsAPointAndTheAutomaticEndIsCapped();
  });

  it('should open the axis on the whole day for an activity of the night', () => {
    givenTheDay(lundi([nuitDuLundiAuMardi]));
    whenVisiting('/operateurs/op-1/journees/2026-10-05');

    thenTheAxisCoversTheWholeDay();
  });

  it('should say when the suivi of an activity is closed', () => {
    givenTheDay(lundi([matin, activiteDuSuiviCloture]));
    whenVisiting('/operateurs/op-1/journees/2026-10-05');

    thenTheClosingIsSaidWithoutAnyButton();
  });

  const enCoursDepuisMidi = activiteRecue({
    id: 'en-cours',
    suivi: 'suivi-1',
    element: ELEMENT,
    poste: tourRecu,
    debut: instantLocal(5, 12),
    etat: 'EN_COURS',
  });

  const finAutomatiqueDuMatin = activiteRecue({
    id: 'automatique',
    suivi: 'suivi-1',
    element: ELEMENT,
    poste: fraiseuseRecue,
    debut: instantLocal(5, 8),
    fin: instantLocal(5, 10),
    etat: 'TERMINEE_AUTOMATIQUEMENT',
    dureeSurLeJour: 'PT2H',
  });

  const activiteDuSuiviCloture = activiteRecue({
    id: 'cloturee',
    suivi: 'suivi-2',
    element: AUTRE_ELEMENT,
    debut: instantLocal(5, 10),
    fin: instantLocal(5, 10, 30),
    etat: 'TERMINEE',
    dureeSurLeJour: 'PT30M',
  });

  const givenTheReport = (): void => {
    releve.install();
    journees.install();
  };
  const givenTheDay = (journee: ReturnType<typeof lundi>): void => {
    journees.seed(journee);
    journees.install();
  };
  const givenTheDays = (...suivantes: ReturnType<typeof lundi>[]): void => {
    suivantes.forEach(journee => {
      journees.seed(journee);
    });
    journees.install();
  };
  const givenAnUnknownOperateur = (): void => {
    new ParametrageApiFixture().install();
    journees.operateurInconnu = true;
    journees.install();
  };
  const givenAFailingRead = (): void => {
    journees.failRead = true;
    journees.install();
  };

  const whenVisiting = (adresse: string): void => {
    cy.viewport(1280, 900);
    cy.clock(HORLOGE, ['Date']);
    cy.visit(adresse);
  };
  const whenVisitingRecording = (adresse: string, reportedErrors: string[]): void => {
    cy.viewport(1280, 900);
    cy.clock(HORLOGE, ['Date']);
    cy.visit(adresse, {
      onBeforeLoad: window => {
        cy.stub(window.console, 'error').callsFake((failure: unknown) => {
          reportedErrors.push(JSON.stringify(failure, Object.getOwnPropertyNames(failure)));
        });
      },
    });
  };
  const whenTheServerRecoversAndTheReadIsRetried = (journee: ReturnType<typeof lundi>): void => {
    cy.get(dataSelector('corriger-retry')).should('be.visible');
    cy.then(() => {
      journees.failRead = false;
      journees.seed(journee);
    });
    cy.get(dataSelector('corriger-retry')).click();
  };
  const whenOpeningTheNextDay = (): void => {
    cy.get(dataSelector('corriger-suivant')).click();
  };
  const whenOpeningTheLinkToTheEndOfTheActivity = (): void => {
    cy.get(dataSelector('activite-lien-fin')).click();
  };

  const thenTheReportOfTheOperatorIsShownWithoutReadingTheDay = (): void => {
    cy.location('pathname').should('eq', '/operateurs/op-1/heures');
    cy.get(dataSelector('synthese-page')).should('exist');
    cy.get('@journeeRead.all').should('have.length', 0);
  };
  const thenTheOperatorIsSaidUnknownWithoutAnyTechnicalReport = (reportedErrors: readonly string[]): void => {
    cy.get(dataSelector('corriger-introuvable')).should('have.text', 'Opérateur introuvable');
    cy.get(dataSelector('frise-operationnel')).should('not.exist');
    cy.wrap(reportedErrors).should('deep.equal', []);
  };
  const thenTheDayReceivedIsShown = (): void => {
    cy.get(dataSelector('corriger-titre')).should('have.text', 'Corriger la journée');
    cy.get(dataSelector('corriger-identite')).should('have.text', 'Hugo LEROY');
    cy.get(dataSelector('frise-operationnel')).should('contain.text', 'Opérationnel : 4 h 45');
    cy.get(dataSelector('activite-horaires')).then(horaires => {
      expect([...horaires].map(element => element.textContent?.trim())).to.deep.equal(['08:00 → 09:30', '18:30 → 21:45']);
    });
    cy.get(dataSelector('activite-poste')).then(postes => {
      expect([...postes].map(element => element.textContent?.trim())).to.deep.equal(['Tour CN 1', 'Fraiseuse 1']);
    });
    cy.get(dataSelector('activite-type')).then(types => {
      expect([...types].map(element => element.textContent?.trim())).to.deep.equal(['Travail', 'Non-conformité']);
    });
    cy.get(dataSelector('activite-duree')).then(durees => {
      expect([...durees].map(element => element.textContent?.trim())).to.deep.equal(['1 h 30', '3 h 15']);
    });
  };
  const thenTheDayOfTheSixthIsShown = (): void => {
    cy.location('pathname').should('eq', '/operateurs/op-1/journees/2026-10-06');
    cy.get(dataSelector('corriger-jour')).should('have.text', 'mardi 6 octobre 2026');
  };
  const thenTheDayOfTheSixthIsShownWithoutNextDay = (): void => {
    thenTheDayOfTheSixthIsShown();
    cy.get(dataSelector('corriger-precedent')).should('have.attr', 'aria-label', 'Voir le lundi 5');
    cy.get(dataSelector('corriger-suivant')).should('not.exist');
  };
  const thenTheActivityInProgressIsAPointAndTheAutomaticEndIsCapped = (): void => {
    cy.get(dataSelector('frise-barre'))
      .filter('[data-style="en-cours"]')
      .should('have.length', 1)
      .and($point => {
        expect($point[0]?.getBoundingClientRect().width).to.be.lessThan(6);
      });
    cy.get(dataSelector('activite-etat')).then(etats => {
      expect([...etats].map(element => element.textContent?.trim())).to.have.members(['en cours', 'fin automatique']);
    });
    cy.get(dataSelector('frise-fin-automatique')).should('have.length', 1).and('be.visible');
    cy.get(dataSelector('frise-barre'))
      .filter('[data-automatique="true"]')
      .then($barre => {
        cy.get(dataSelector('frise-fin-automatique')).should($embout => {
          expect($embout[0]?.getBoundingClientRect().right).to.be.closeTo($barre[0]?.getBoundingClientRect().right ?? 0, 2);
        });
      });
  };
  const thenTheAxisCoversTheWholeDay = (): void => {
    cy.get(dataSelector('frise-repere')).then(reperes => {
      const libelles = [...reperes].map(element => element.textContent?.trim());
      expect([libelles[0], libelles.at(-1)]).to.deep.equal(['0 h', '24 h']);
    });
  };
  const thenTheClosingIsSaidWithoutAnyButton = (): void => {
    cy.get(dataSelector('activite-cloture')).should('have.text', 'Clôturé le lundi 5 à 11:00');
    cy.get(dataSelector('activite-cloture')).closest('[data-selector="activite"]').find('button').should('not.exist');
  };
});
