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

  it('should send nothing and keep the activity when the manager keeps it after being asked to confirm', () => {
    givenTheDayAndItsRemoval(lundi([matin, nuitDuLundiAuMardi], 'PT3H30M'), lundi([matin], 'PT1H30M'));
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToRemoveTheActivityOfTheNight();
    whenKeepingTheActivity();

    thenNothingWasSentAndTheActivityIsKept();
  });

  it('should show what removing costs before it is confirmed', () => {
    givenTheDay(lundi([matin, nuitDuLundiAuMardi], 'PT3H30M'));
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToRemoveTheActivityOfTheNight();

    thenTheRemovalIsExplainedDayByDay();
  });

  it('should send the removal once, read the day again and say the activity was removed', () => {
    givenTheDayAndItsRemoval(lundi([matin, soirNonConforme], 'PT4H45M'), lundi([matin], 'PT1H30M'));
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToRemoveTheActivityOfTheEvening();
    whenConfirmingTheRemovalWithADoubleClick();

    thenOneRemovalWasSentAndTheDayIsReadAgainWithoutTheActivity();
  });

  it('should read the day again and ask to start over when the day changed meanwhile', () => {
    givenTheDayAndItsRemoval(lundi([matin, soirNonConforme], 'PT4H45M'), lundi([matin], 'PT1H30M'));
    givenTheDayChangedMeanwhile();
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToRemoveTheActivityOfTheEvening();
    whenConfirmingTheRemovalWithADoubleClick();

    thenTheDayIsReadAgainAndTheManagerIsAskedToStartOver();
  });

  it('should keep the day on screen while it is read again, and move the focus to the message', () => {
    givenTheDayAndItsRemoval(lundi([matin, soirNonConforme], 'PT4H45M'), lundi([matin], 'PT1H30M'));
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenTheNextReadsAreHeld();
    whenAskingToRemoveTheActivityOfTheEvening();
    whenConfirmingTheRemoval();

    thenTheDayStaysOnScreenWhileItIsReadAgainAndTheFocusIsOnTheMessage();
  });

  it('should offer the workstations the operator is allowed on to change the workstation of an activity', () => {
    givenTheDayAndItsChange(lundi(), lundi());
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToChangeTheWorkstationOfTheMorning();

    thenTheWorkstationsAllowedAreOfferedBesideTheDay();
  });

  it('should say there is nothing to save when the operator is allowed on the current workstation only', () => {
    givenTheDay({ ...lundi(), choix: { ...lundi().choix, postes: [tourRecu] } });
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToChangeTheWorkstationOfTheMorning();

    thenThereIsNoOtherWorkstationAndNothingToSave();
  });

  it('should send the change of workstation once, read the day again and say the workstation was changed', () => {
    givenTheDayAndItsChange(lundi(), lundi([matinSurLaFraiseuse, soirNonConforme]));
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToChangeTheWorkstationOfTheMorning();
    whenSavingTheChangeWithADoubleClick();

    thenOneChangeWasSentAndTheDayIsReadAgainWithTheNewWorkstation();
  });

  it('should explain the refusal under the buttons and keep the entry when the new workstation overlaps another activity', () => {
    givenTheDayAndItsChange(lundi(), lundi());
    givenTheNewWorkstationOverlaps();
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToChangeTheWorkstationOfTheMorning();
    whenSavingTheChange();

    thenTheOverlapIsExplainedAndTheEntryKept();
  });

  it('should read the day again and ask to start over when the day changed meanwhile the change of workstation', () => {
    givenTheDayAndItsChange(lundi(), lundi([matinSurLaFraiseuse, soirNonConforme]));
    givenTheDayChangedMeanwhile();
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToChangeTheWorkstationOfTheMorning();
    whenSavingTheChange();

    thenTheChangeIsClosedAndTheDayIsReadAgainWithTheMessageToStartOver();
  });

  it('should offer the elements present that day, closed ones included, and the workstations the operator is allowed on', () => {
    givenTheDay(lundi());
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToAddAnActivity();
    whenOpeningTheElements();

    thenTheElementsAndTheWorkstationsAllowedAreOffered();
  });

  it('should tell an hour badly written under the hours', () => {
    givenTheDay(lundi());
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToAddAnActivity();
    whenTypingTheHours('25:00', '10:00');

    thenTheErrorUnderTheHoursIs('Heure attendue au format 00:00.');
  });

  it('should send nothing and tell the end must follow the start when adding with an end equal to the start', () => {
    givenTheDayAndItsAddition(lundi(), lundi());
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToAddAnActivity();
    whenChoosingTheElement('OF 24-131 · Pièce 1');
    whenTypingTheHours('10:00', '10:00');
    whenAddingTheActivity();

    thenTheErrorUnderTheHoursIsAndNothingWasSent('La fin doit suivre le début.');
  });

  it('should open the axis of the frise on the whole day for an addition typed at 5 h and draw it dotted', () => {
    givenTheDay(lundi());
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToAddAnActivity();
    whenChoosingTheElement('OF 24-131 · Pièce 1');
    whenTypingTheHours('05:00', '06:30');

    thenTheAxisCoversTheWholeDayAndTheAdditionIsDrawnDotted();
  });

  it('should send the addition once, read the day again and say the activity was added', () => {
    givenTheDayAndItsAddition(lundi(), lundi([matin, soirNonConforme, ajoutee], 'PT8H00M'));
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToAddAnActivity();
    whenChoosingTheElement('OF 24-131 · Pièce 1');
    whenTypingTheHours('12:00', '15:15');
    whenAddingTheActivityWithADoubleClick();

    thenOneAdditionWasSentAndTheDayIsReadAgainWithTheActivity();
  });

  it('should end the activity the next day, send nothing and clear the error when the manager applies the proposal', () => {
    givenTheDayAndItsAddition(lundi(), lundi());
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToAddAnActivity();
    whenChoosingTheElement('OF 24-131 · Pièce 1');
    whenTypingTheHours('22:00', '03:30');
    whenApplyingTheProposalToFinishTheNextDay();

    thenTheActivityEndsTheNextDayWithoutErrorAndNothingWasSent();
  });

  it('should draw the addition ending the next day cut at midnight, dotted, and show the operational time before and after', () => {
    givenTheDay(lundi());
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToAddAnActivity();
    whenChoosingTheElement('OF 24-131 · Pièce 1');
    whenChoosingTheDayOfTheEnd('Mardi 6');
    whenTypingTheHours('22:00', '03:30');

    thenTheAdditionIsCutAtMidnightAndTheContinuationIsNamed();
  });

  it('should name the portion of each day once an activity ending the next day is added and lead to the next day', () => {
    givenTheDayAndItsAddition(lundi(), lundi([matin, soirNonConforme, nuitDuLundiAuMardi], 'PT6H45M'));
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToAddAnActivity();
    whenChoosingTheElement('OF 24-131 · Pièce 1');
    whenChoosingTheDayOfTheEnd('Mardi 6');
    whenTypingTheHours('22:00', '03:30');
    whenAddingTheActivity();

    thenEachDayIsNamedWithALinkToTheNextDay();
  });

  it('should explain the overlap under the buttons and keep the entry', () => {
    givenTheDayAndItsAddition(lundi(), lundi());
    givenTheAdditionOverlaps();
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToAddAnActivity();
    whenChoosingTheElement('OF 24-131 · Pièce 1');
    whenTypingTheHours('12:00', '15:15');
    whenAddingTheActivity();

    thenTheRefusalIsExplainedAndTheEntryKept('Une autre activité de cet élément se chevauche déjà sur ce poste.');
  });

  it('should explain the end following the clock of the server under the buttons and keep the entry', () => {
    givenTheDayAndItsAddition(lundi(), lundi());
    givenTheEndFollowsTheClockOfTheServer();
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToAddAnActivity();
    whenChoosingTheElement('OF 24-131 · Pièce 1');
    whenTypingTheHours('12:00', '15:15');
    whenAddingTheActivity();

    thenTheRefusalIsExplainedAndTheEntryKept(
      'La fin dépasse l’heure du serveur. Choisissez une heure plus tôt ou réessayez dans un instant.',
    );
  });

  it('should read the day again and ask to start over when the day changed meanwhile the addition', () => {
    givenTheDayAndItsAddition(lundi(), lundi([matin, soirNonConforme, ajoutee], 'PT8H00M'));
    givenTheDayChangedMeanwhile();
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToAddAnActivity();
    whenChoosingTheElement('OF 24-131 · Pièce 1');
    whenTypingTheHours('12:00', '15:15');
    whenAddingTheActivity();

    thenTheAdditionIsClosedAndTheDayIsReadAgainWithTheMessageToStartOver();
  });

  it('should drop the panel, its entry and the message of a previous correction when the manager moves to another day', () => {
    givenTheDaysAndTheRemoval(lundi([matin, soirNonConforme], 'PT4H45M'), lundi([matin], 'PT1H30M'), journeeRecue(6, SUIVIS, []));
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToRemoveTheActivityOfTheEvening();
    whenConfirmingTheRemoval();
    whenAskingToAddAnActivity();
    whenChoosingTheElement('OF 24-131 · Pièce 1');
    whenTypingTheHours('12:00', '15:15');
    whenOpeningTheNextDay();

    thenTheAdditionIsDroppedWithTheDay();
  });

  it('should open the panel to change the workstation instead of the panel to add an activity', () => {
    givenTheDayAndItsChange(lundi(), lundi());
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToAddAnActivity();
    whenAskingToChangeTheWorkstationOfTheMorning();

    thenOnlyThePanelToChangeTheWorkstationIsOpen();
  });

  it('should lose the entry of the addition once the panel to change the workstation took its place', () => {
    givenTheDayAndItsChange(lundi(), lundi());
    whenVisiting('/operateurs/op-1/journees/2026-10-05');
    whenAskingToAddAnActivity();
    whenChoosingTheElement('OF 24-131 · Pièce 1');
    whenTypingTheHours('12:00', '15:15');
    whenAskingToChangeTheWorkstationOfTheMorning();
    whenAskingToAddAnActivity();

    thenTheAdditionStartsEmpty();
  });

  const matinSurLaFraiseuse = { ...matin, poste: fraiseuseRecue };

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

  const ajoutee = activiteRecue({
    id: 'ajoutee',
    suivi: 'suivi-1',
    element: ELEMENT,
    poste: tourRecu,
    debut: instantLocal(5, 12),
    fin: instantLocal(5, 15, 15),
    etat: 'TERMINEE',
    dureeSurLeJour: 'PT3H15M',
  });

  const givenTheDayAndItsAddition = (avant: ReturnType<typeof lundi>, apres: ReturnType<typeof lundi>): void => {
    givenTheDay(avant);
    journees.apresLaCorrection(apres);
    journees.installAjout();
  };
  const givenTheAdditionOverlaps = (): void => {
    journees.chevauchement = true;
  };
  const givenTheEndFollowsTheClockOfTheServer = (): void => {
    journees.finFuture = true;
  };

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
  const givenTheDayAndItsRemoval = (avant: ReturnType<typeof lundi>, apres: ReturnType<typeof lundi>): void => {
    givenTheDay(avant);
    journees.apresLaCorrection(apres);
    journees.installRetrait();
  };
  const givenTheDaysAndTheRemoval = (
    avant: ReturnType<typeof lundi>,
    apres: ReturnType<typeof lundi>,
    suivante: ReturnType<typeof lundi>,
  ): void => {
    givenTheDays(avant, suivante);
    journees.apresLaCorrection(apres);
    journees.installRetrait();
  };
  const givenTheDayChangedMeanwhile = (): void => {
    journees.journeeChangee = true;
  };
  const givenTheDayAndItsChange = (avant: ReturnType<typeof lundi>, apres: ReturnType<typeof lundi>): void => {
    givenTheDay(avant);
    journees.apresLaCorrection(apres);
    journees.installChangementDePoste();
  };
  const givenTheNewWorkstationOverlaps = (): void => {
    journees.chevauchement = true;
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
  const whenAskingToRemoveTheActivityOfTheNight = (): void => {
    cy.get(dataSelector('activite-retirer')).eq(1).click();
  };
  const whenAskingToRemoveTheActivityOfTheEvening = (): void => {
    cy.get(dataSelector('activite-retirer')).eq(1).click();
  };
  const whenKeepingTheActivity = (): void => {
    cy.get(dataSelector('retrait-cancel')).click();
  };
  const whenTheNextReadsAreHeld = (): void => {
    cy.get(dataSelector('activite-horaires')).should('have.length', 2);
    cy.then(() => {
      journees.retenirLesLecturesSuivantes();
    });
  };
  const whenConfirmingTheRemoval = (): void => {
    cy.get(dataSelector('retrait-confirm')).click();
  };
  const whenConfirmingTheRemovalWithADoubleClick = (): void => {
    cy.get(dataSelector('retrait-confirm')).dblclick();
  };
  const whenAskingToChangeTheWorkstationOfTheMorning = (): void => {
    cy.get(dataSelector('activite-changer-poste')).first().click();
  };
  const whenSavingTheChange = (): void => {
    cy.get(dataSelector('changement-enregistrer')).click();
  };
  const whenSavingTheChangeWithADoubleClick = (): void => {
    cy.get(dataSelector('changement-enregistrer')).dblclick();
  };
  const whenAskingToAddAnActivity = (): void => {
    cy.get(dataSelector('activite-ajouter')).click();
  };
  const whenOpeningTheElements = (): void => {
    cy.get(dataSelector('ajout-element')).click();
  };
  const whenChoosingTheElement = (libelle: string): void => {
    cy.get(dataSelector('ajout-element')).click();
    cy.get(dataSelector('ajout-element-proposition')).contains(libelle).click();
  };
  const whenTypingTheHours = (debut: string, fin: string): void => {
    cy.get(dataSelector('ajout-debut')).clear();
    cy.get(dataSelector('ajout-debut')).type(debut);
    cy.get(dataSelector('ajout-fin')).clear();
    cy.get(dataSelector('ajout-fin')).type(fin);
    cy.get(dataSelector('ajout-fin')).blur();
  };
  const whenChoosingTheDayOfTheEnd = (libelle: string): void => {
    cy.get(dataSelector('ajout-jour-fin')).contains(libelle).click();
  };
  const whenApplyingTheProposalToFinishTheNextDay = (): void => {
    cy.get(dataSelector('ajout-proposition')).should('have.text', ' Finir le mardi 6 à 03:30 ').click();
  };
  const whenAddingTheActivity = (): void => {
    cy.get(dataSelector('ajout-ajouter')).click();
  };
  const whenAddingTheActivityWithADoubleClick = (): void => {
    cy.get(dataSelector('ajout-ajouter')).dblclick();
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
  const thenNothingWasSentAndTheActivityIsKept = (): void => {
    cy.get(dataSelector('retrait-confirm')).should('not.exist');
    cy.get(dataSelector('activite-horaires')).should('have.length', 2);
    cy.get(dataSelector('corriger-annonce')).should('not.exist');
    cy.get('@retraitWrite.all').should('have.length', 0);
  };
  const thenTheRemovalIsExplainedDayByDay = (): void => {
    cy.get(dataSelector('retrait-title')).should('have.text', 'Retirer l’activité du lundi 5, 22:00, au mardi 6, 03:30 ?');
    cy.get(dataSelector('retrait-effet-libelle')).then(libelles => {
      expect([...libelles].map(element => element.textContent?.trim())).to.deep.equal(['Opérationnel du lundi 5', 'mardi 6']);
    });
    cy.get(dataSelector('retrait-effet-valeur')).then(valeurs => {
      expect([...valeurs].map(element => element.textContent?.trim())).to.deep.equal(['3 h 30 → 1 h 30', '− 3 h 30']);
    });
    cy.get(dataSelector('retrait-debordement')).should(
      'have.text',
      'Le retrait vaut pour toute l’activité : le mardi 6 perd aussi 3 h 30.',
    );
  };
  const thenOneRemovalWasSentAndTheDayIsReadAgainWithoutTheActivity = (): void => {
    cy.get(dataSelector('corriger-annonce')).should('have.text', 'Activité retirée');
    cy.get('@retraitWrite.all').should('have.length', 1);
    cy.get('@retraitWrite')
      .its('request.url')
      .should('match', /\/api\/atelier\/suivis\/suivi-1\/activites\/soir\/retrait$/);
    cy.get('@retraitWrite')
      .its('request.body.id')
      .should('match', /^[0-9a-f-]{36}$/);
    cy.get('@journeeRead.all').should('have.length', 2);
    cy.get(dataSelector('retrait-confirm')).should('not.exist');
    cy.get(dataSelector('activite-horaires')).should('have.length', 1);
    cy.get(dataSelector('frise-operationnel')).should('contain.text', 'Opérationnel : 1 h 30');
  };
  const thenTheDayStaysOnScreenWhileItIsReadAgainAndTheFocusIsOnTheMessage = (): void => {
    cy.get(dataSelector('corriger-annonce')).should('have.text', 'Activité retirée');
    cy.get(dataSelector('corriger-chargement')).should('not.exist');
    cy.get(dataSelector('activite-horaires')).should('have.length', 2);
    cy.get(dataSelector('frise-operationnel')).should('contain.text', 'Opérationnel : 4 h 45');
    cy.get(dataSelector('corriger-identite')).should('have.text', 'Hugo LEROY');
    cy.focused().should('have.attr', 'data-selector', 'corriger-annonce');
  };
  const thenTheDayIsReadAgainAndTheManagerIsAskedToStartOver = (): void => {
    cy.get(dataSelector('corriger-annonce')).should('have.text', 'La journée a changé, recommencez');
    cy.get('@journeeRead.all').should('have.length', 2);
    cy.get(dataSelector('retrait-confirm')).should('not.exist');
    cy.get(dataSelector('activite-horaires')).should('have.length', 1);
  };
  const thenTheWorkstationsAllowedAreOfferedBesideTheDay = (): void => {
    cy.get(dataSelector('changement-titre')).should('have.text', 'Changer le poste');
    cy.get('option').then(options => {
      expect([...options].map(option => option.textContent.trim())).to.deep.equal(['Tour CN 1 · Tournage', 'Fraiseuse 1 · Fraisage']);
      expect([...options].map(option => option.disabled)).to.deep.equal([true, false]);
    });
    cy.get(dataSelector('changement-etait')).should($element => {
      expect($element.text().trim()).to.equal('Était : Tour CN 1 · Tournage');
    });
    cy.get(dataSelector('changement-effet')).should($element => {
      expect($element.text().trim()).to.equal('Le temps ne change pas');
    });
    cy.focused().should('have.attr', 'data-selector', 'changement-poste');
    cy.get(dataSelector('frise-operationnel')).should('be.visible');
    cy.get(dataSelector('activite-horaires')).should('have.length', 2);
    cy.get(dataSelector('activite')).first().should('have.attr', 'aria-current', 'true');
  };
  const thenThereIsNoOtherWorkstationAndNothingToSave = (): void => {
    cy.get(dataSelector('changement-aucun-poste')).should($element => {
      expect($element.text().trim()).to.equal('Aucun autre poste habilité pour cet opérateur.');
    });
    cy.get(dataSelector('changement-enregistrer')).should('not.exist');
    cy.get(dataSelector('changement-abandonner')).should('be.visible');
  };
  const thenOneChangeWasSentAndTheDayIsReadAgainWithTheNewWorkstation = (): void => {
    cy.get(dataSelector('corriger-annonce')).should('have.text', 'Poste modifié');
    cy.get('@changementWrite.all').should('have.length', 1);
    cy.get('@changementWrite')
      .its('request.url')
      .should('match', /\/api\/atelier\/suivis\/suivi-1\/activites\/matin\/poste$/);
    cy.get('@changementWrite').its('request.body.poste').should('equal', 'poste-fraise');
    cy.get('@changementWrite')
      .its('request.body.id')
      .should('match', /^[0-9a-f-]{36}$/);
    cy.get('@journeeRead.all').should('have.length', 2);
    cy.get(dataSelector('changement-titre')).should('not.exist');
    cy.get(dataSelector('activite-poste')).first().should('have.text', 'Fraiseuse 1');
    cy.focused().should('have.attr', 'data-selector', 'activite-changer-poste');
  };
  const thenTheOverlapIsExplainedAndTheEntryKept = (): void => {
    cy.get(dataSelector('changement-refus')).should($element => {
      expect($element.text().trim()).to.equal('Une autre activité de cet élément se chevauche déjà sur ce poste.');
    });
    cy.get(dataSelector('changement-poste')).should('have.value', 'poste-fraise');
    cy.get('@journeeRead.all').should('have.length', 1);
    cy.get(dataSelector('corriger-annonce')).should('not.exist');
  };
  const thenTheChangeIsClosedAndTheDayIsReadAgainWithTheMessageToStartOver = (): void => {
    cy.get(dataSelector('corriger-annonce')).should('have.text', 'La journée a changé, recommencez');
    cy.get(dataSelector('changement-titre')).should('not.exist');
    cy.get('@journeeRead.all').should('have.length', 2);
  };
  const thenTheElementsAndTheWorkstationsAllowedAreOffered = (): void => {
    cy.get(dataSelector('ajout-element-proposition')).then(propositions => {
      expect([...propositions].map(element => element.textContent.trim())).to.deep.equal(['MOULE 24-132 · Pièce 2', 'OF 24-131 · Pièce 1']);
    });
    cy.get(dataSelector('ajout-poste'))
      .find('option')
      .then(options => {
        expect([...options].map(option => option.textContent.trim())).to.deep.equal(['Tour CN 1 · Tournage', 'Fraiseuse 1 · Fraisage']);
      });
    cy.get(dataSelector('ajout-type')).then(types => {
      expect([...types].map(element => element.textContent.trim())).to.deep.equal(['Travail', 'Non-conformité']);
    });
    cy.get(dataSelector('ajout-titre')).should('have.text', 'Ajouter une activité');
  };
  const thenTheErrorUnderTheHoursIs = (erreur: string): void => {
    cy.get(dataSelector('ajout-erreur')).should($element => {
      expect($element.text().trim()).to.equal(erreur);
    });
  };
  const thenTheErrorUnderTheHoursIsAndNothingWasSent = (erreur: string): void => {
    thenTheErrorUnderTheHoursIs(erreur);
    cy.get('@ajoutWrite.all').should('have.length', 0);
  };
  const thenTheAxisCoversTheWholeDayAndTheAdditionIsDrawnDotted = (): void => {
    thenTheAxisCoversTheWholeDay();
    cy.get(dataSelector('frise-barre'))
      .filter('[data-en-attente="true"]')
      .should('have.length', 1)
      .and('be.visible')
      .and('have.css', 'border-top-style', 'dashed');
    cy.get(dataSelector('frise-operationnel')).should('contain.text', 'Opérationnel : 4 h 45 → 6 h 15');
  };
  const thenOneAdditionWasSentAndTheDayIsReadAgainWithTheActivity = (): void => {
    cy.get(dataSelector('corriger-annonce')).should('have.text', 'Activité ajoutée');
    cy.get('@ajoutWrite.all').should('have.length', 1);
    cy.get('@ajoutWrite')
      .its('request.url')
      .should('match', /\/api\/atelier\/suivis\/suivi-1\/activites$/);
    cy.get('@ajoutWrite').its('request.body.operateur').should('equal', 'op-1');
    cy.get('@ajoutWrite').its('request.body.poste').should('equal', 'poste-tour');
    cy.get('@ajoutWrite').its('request.body.categorie').should('equal', 'TRAVAIL');
    cy.get('@ajoutWrite')
      .its('request.body.id')
      .should('match', /^[0-9a-f-]{36}$/);
    cy.get('@ajoutWrite')
      .its('request.body.debut')
      .should('match', /^2026-10-05T12:00:00[+-]\d{2}:\d{2}$/);
    cy.get('@ajoutWrite')
      .its('request.body.fin')
      .should('match', /^2026-10-05T15:15:00[+-]\d{2}:\d{2}$/);
    cy.get('@journeeRead.all').should('have.length', 2);
    cy.get(dataSelector('ajout-titre')).should('not.exist');
    cy.get(dataSelector('activite-horaires')).should('have.length', 3);
    cy.get(dataSelector('frise-operationnel')).should('contain.text', 'Opérationnel : 8 h 00');
    cy.focused().should('have.attr', 'data-selector', 'activite-ajouter');
  };
  const thenTheActivityEndsTheNextDayWithoutErrorAndNothingWasSent = (): void => {
    cy.get(dataSelector('ajout-erreur')).should('not.exist');
    cy.get(dataSelector('ajout-proposition')).should('not.exist');
    cy.get(dataSelector('ajout-jour-fin')).then(jours => {
      expect([...jours].map(element => element.getAttribute('aria-pressed'))).to.deep.equal(['false', 'true']);
    });
    cy.get(dataSelector('ajout-duree')).should('have.text', '5 h 30');
    cy.get('@ajoutWrite.all').should('have.length', 0);
  };
  const thenTheAdditionIsCutAtMidnightAndTheContinuationIsNamed = (): void => {
    cy.get(dataSelector('frise-barre'))
      .filter('[data-en-attente="true"]')
      .should('have.length', 1)
      .and('have.css', 'border-top-style', 'dashed')
      .and('have.attr', 'data-coupee-a-la-fin', 'true');
    cy.get(dataSelector('frise-mention')).should('have.text', '2 h 00 ce jour · suite le mardi 6 →');
    cy.get(dataSelector('frise-operationnel')).should('contain.text', 'Opérationnel : 4 h 45 → 6 h 45');
    cy.get(dataSelector('ajout-effet-valeur')).then(valeurs => {
      expect([...valeurs].map(element => element.textContent.trim())).to.deep.equal(['4 h 45 → 6 h 45', '+ 3 h 30']);
    });
    thenTheAxisCoversTheWholeDay();
  };
  const thenEachDayIsNamedWithALinkToTheNextDay = (): void => {
    cy.get(dataSelector('corriger-annonce')).should('have.text', 'Activité ajoutée : 2 h 00 ce lundi, 3 h 30 le mardi 6');
    cy.get(dataSelector('corriger-annonce-suite'))
      .should('have.text', 'Voir le mardi 6')
      .and('have.attr', 'href', '/operateurs/op-1/journees/2026-10-06');
    cy.get('@ajoutWrite')
      .its('request.body.fin')
      .should('match', /^2026-10-06T03:30:00[+-]\d{2}:\d{2}$/);
  };
  const thenTheRefusalIsExplainedAndTheEntryKept = (libelle: string): void => {
    cy.get(dataSelector('ajout-refus')).should($element => {
      expect($element.text().trim()).to.equal(libelle);
    });
    cy.get(dataSelector('ajout-element')).should('contain.text', 'OF 24-131 · Pièce 1');
    cy.get(dataSelector('ajout-debut')).should('have.value', '12:00');
    cy.get(dataSelector('ajout-fin')).should('have.value', '15:15');
    cy.get('@journeeRead.all').should('have.length', 1);
    cy.get(dataSelector('corriger-annonce')).should('not.exist');
  };
  const thenTheAdditionIsClosedAndTheDayIsReadAgainWithTheMessageToStartOver = (): void => {
    cy.get(dataSelector('corriger-annonce')).should('have.text', 'La journée a changé, recommencez');
    cy.get(dataSelector('ajout-titre')).should('not.exist');
    cy.get('@journeeRead.all').should('have.length', 2);
  };
  const thenTheAdditionIsDroppedWithTheDay = (): void => {
    thenTheDayOfTheSixthIsShown();
    cy.get(dataSelector('ajout-titre')).should('not.exist');
    cy.get(dataSelector('corriger-annonce')).should('not.exist');
    cy.get(dataSelector('frise-barre')).should('not.exist');
  };
  const thenOnlyThePanelToChangeTheWorkstationIsOpen = (): void => {
    cy.get(dataSelector('ajout-titre')).should('not.exist');
    cy.get(dataSelector('changement-titre')).should('have.text', 'Changer le poste');
    cy.get(dataSelector('activite-ajouter')).should('have.attr', 'aria-expanded', 'false');
  };
  const thenTheAdditionStartsEmpty = (): void => {
    cy.get(dataSelector('ajout-debut')).should('have.value', '');
    cy.get(dataSelector('ajout-fin')).should('have.value', '');
    cy.get(dataSelector('ajout-element')).should('contain.text', 'Choisir un élément');
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
    cy.get(dataSelector('frise-repere')).should(reperes => {
      const libelles = [...reperes].map(element => element.textContent?.trim());
      expect([libelles[0], libelles.at(-1)]).to.deep.equal(['0 h', '24 h']);
    });
  };
  const thenTheClosingIsSaidWithoutAnyButton = (): void => {
    cy.get(dataSelector('activite-cloture')).should('have.text', 'Clôturé le lundi 5 à 11:00');
    cy.get(dataSelector('activite-cloture')).closest('[data-selector="activite"]').find('button').should('not.exist');
  };
});
