import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';
import {
  confirmationFixture,
  debutFixture,
  dossierFixture,
  finFixture,
  instantFinFixture,
  instantFinLocalFixture,
  journalFixture,
  ligneFixture,
  ncFixture,
  operateurFixture,
  remplacementFixture,
  suiviFixture,
} from '../../../utils/gestion/anomalies-de-pointage/AnomaliesHttp.fixture';
import { thenTheInstantFieldsAreEmpty, thenTheInstantFieldsShow } from '../../../utils/gestion/anomalies-de-pointage/InstantField';
import { instantLocalFixture, instantLocalWithOffsetFixture } from '../../../utils/gestion/anomalies-de-pointage/InstantLocal.fixture';
import type {} from '../../../utils/gestion/anomalies-de-pointage/anomalies-de-pointage.provider';

const posteFixture = '70000000-0000-0000-0000-000000000008';
const motifCorrectionFixture = 'La cible est la NC.';

const dossierRecuFixture = (): components['schemas']['RestDossierAnomalie'] => {
  const dossier = dossierFixture();
  return {
    ...dossier,
    suivi: { ...dossier.suivi, journal: journalFixture.map(fait => ({ ...fait, posteId: posteFixture })) },
    choix: [...dossier.choix, { code: 'ANNULER_TRANSITION', kind: 'ANNULATION', pointage: ncFixture }],
  };
};

const dossierApresFixture = (): components['schemas']['RestDossierAnomalie'] => {
  const dossier = dossierFixture(true);
  return {
    ...dossier,
    activites: [
      requiredFixture(dossier.activites[0], 'donnée HTTP de résolution'),
      { ...requiredFixture(dossier.activites[1], 'donnée HTTP de résolution'), fin: instantFinFixture, duree: 'PT5H' },
    ],
    suivi: {
      ...dossier.suivi,
      journal: [
        ...journalFixture.slice(0, 2),
        {
          ...requiredFixture(journalFixture[2], 'donnée HTTP de résolution'),
          annulation: { motif: motifCorrectionFixture, auteur: 'gestionnaire', date: '2026-10-04T10:00:00Z' },
        },
        { ...requiredFixture(dossier.suivi.journal[3], 'donnée HTTP de résolution'), dateDeSurvenue: instantFinFixture },
      ],
    },
  };
};

describe('Conflict dossier in Gestion', () => {
  beforeEach(() => {
    givenTheClockOnAFixedDay();
    cy.intercept('GET', `/api/atelier/suivis/${suiviFixture}/anomalies/${finFixture}`, { body: dossierRecuFixture() }).as('dossier');
    cy.intercept('POST', `/api/atelier/suivis/${suiviFixture}/anomalies/${finFixture}/apercus`, request => {
      const body = request.body as components['schemas']['RestDemandeDApercu'];
      request.reply({
        body: {
          commande: body.commande,
          adresse: ligneFixture.adresse,
          revision: 3,
          evaluation: '2026-10-04T10:00:00Z',
          empreinteConsequences: 'empreinte-consequences',
          evenement: remplacementFixture,
          acte: body.acte,
          avant: dossierRecuFixture(),
          apres: dossierApresFixture(),
        } satisfies components['schemas']['RestApercuDeResolution'],
      });
    }).as('apercu');
  });
  it('should open the correction from the received end and identify the fact being edited', () => {
    whenOpeningTheDossierAt(320);
    whenCorrectingTheReceivedEnd();

    thenTheReceivedEndIsReadyToEdit();
  });

  const whenCorrectingTheReceivedEnd = (): void => {
    cy.get(dataSelector('anomalie-pointage')).last().find(dataSelector('anomalie-corriger')).click();
  };

  const thenTheReceivedEndIsReadyToEdit = (): void => {
    cy.get(dataSelector('anomalie-proposition-titre')).should('have.focus');
    cy.get(dataSelector('anomalie-proposition-resume'))
      .should('contain.text', '17:00:00')
      .and('contain.text', 'Travail · lundi 14 septembre à 08:00');
    thenTheInstantFieldsShow(instantFinLocalFixture);
    cy.get(dataSelector('anomalie-cible')).should('have.value', debutFixture);
  };

  it('should identify the chosen interpretation while its reason is being entered', () => {
    whenOpeningTheDossier();
    whenChoosingTheGuidedCorrection();

    thenTheChosenInterpretationIsIdentified();
  });

  const thenTheChosenInterpretationIsIdentified = (): void => {
    cy.get(dataSelector('anomalie-choix')).first().should('have.attr', 'aria-pressed', 'true');
    cy.get(dataSelector('anomalie-choix')).last().should('have.attr', 'aria-pressed', 'false');
  };

  it('should show the consequences before the optional journal comparison on a narrow screen', () => {
    whenOpeningTheDossierAt(320);
    whenPreparingTheGuidedCorrection();

    thenTheConsequencesAreVisibleWithoutOpeningTheJournal();
  });

  const thenTheConsequencesAreVisibleWithoutOpeningTheJournal = (): void => {
    cy.get(dataSelector('anomalie-apercu-consequences'))
      .should('be.visible')
      .and('contain.text', 'Terminée · 4 h')
      .and('contain.text', 'Terminée · 5 h');
    cy.get(dataSelector('anomalie-apercu-journal')).should('not.have.attr', 'open');
    cy.get(dataSelector(`anomalie-apercu-fait-avant-${finFixture}`)).should(fait => {
      expect(fait[0]?.checkVisibility()).to.equal(false);
    });
    cy.get(dataSelector('anomalie-apercu-consequences')).then(consequences => {
      cy.get(dataSelector('anomalie-apercu-journal-ouvrir')).should(journal => {
        expect(consequences[0]?.getBoundingClientRect().bottom).to.be.at.most(journal[0]?.getBoundingClientRect().top ?? 0);
      });
    });
    cy.get(dataSelector('anomalie-confirmer')).should('be.enabled');
  };

  it('should compare the exact previewed act and its before and after facts before confirmation', () => {
    whenOpeningTheDossier();
    whenPreparingTheGuidedCorrection();
    whenOpeningThePreviewJournal();

    thenThePreviewComparesTheOriginalFactWithItsReplacement();
  });

  const thenThePreviewComparesTheOriginalFactWithItsReplacement = (): void => {
    cy.get(dataSelector('anomalie-apercu-acte')).should('contain.text', finFixture).and('contain.text', 'La cible est la NC.');
    cy.get(dataSelector(`anomalie-apercu-fait-avant-${finFixture}`))
      .should('be.visible')
      .and('contain.text', debutFixture)
      .and('not.contain.text', 'Pointage annulé');
    cy.get(dataSelector(`anomalie-apercu-fait-apres-${finFixture}`)).should('contain.text', 'Pointage annulé');
    cy.get(dataSelector(`anomalie-apercu-fait-apres-${remplacementFixture}`))
      .should('contain.text', ncFixture)
      .and('contain.text', `Remplace le pointage ${finFixture}`);
    cy.get(dataSelector('anomalie-pointage')).should('have.length', 3);
  };

  const whenOpeningThePreviewJournal = (): void => {
    cy.get(dataSelector('anomalie-apercu-journal-ouvrir')).click();
  };

  it('should identify an absent workstation while showing the received instant to the second', () => {
    whenOpeningTheDossierWithoutAWorkstation();

    thenTheFactsShowTheirSecondsAndNameTheAbsentWorkstation();
  });

  const whenOpeningTheDossierWithoutAWorkstation = (): void => {
    cy.viewport(1280, 900);
    cy.intercept('GET', `/api/atelier/suivis/${suiviFixture}/anomalies/${finFixture}`, { body: dossierFixture() });
    cy.visit(`/anomalies/${suiviFixture}?pointage=${finFixture}`);
  };

  const thenTheFactsShowTheirSecondsAndNameTheAbsentWorkstation = (): void => {
    cy.get(dataSelector('anomalie-pointage')).should('contain.text', '08:00:00 · lundi 14 septembre');
    cy.get(dataSelector('anomalie-pointage')).should('contain.text', 'lundi 14 septembre à 08:00:00');
    cy.get(dataSelector('anomalie-pointage')).each(pointage => {
      cy.wrap(pointage).should('contain.text', 'Poste : Sans poste');
    });
  };

  it('should identify the operator and workstation of every received fact', () => {
    whenOpeningTheDossier();

    thenEveryFactIdentifiesItsOperatorAndWorkstation();
  });

  const thenEveryFactIdentifiesItsOperatorAndWorkstation = (): void => {
    cy.get(dataSelector('anomalie-pointage')).each(pointage => {
      cy.wrap(pointage).should('contain.text', `Opérateur : ${operateurFixture}`).and('contain.text', `Poste : ${posteFixture}`);
    });
  };

  it('should display received facts in chronological order while keeping equal instants separate', () => {
    whenOpeningTheDossierWithEqualInstants();

    thenTheReceivedFactsFollowTheirOccurrenceTime();
  });

  const whenOpeningTheDossierWithEqualInstants = (): void => {
    cy.viewport(1280, 900);
    const dossier = dossierRecuFixture();
    cy.intercept('GET', `/api/atelier/suivis/${suiviFixture}/anomalies/${finFixture}`, {
      body: {
        ...dossier,
        suivi: {
          ...dossier.suivi,
          journal: [
            ...dossier.suivi.journal,
            {
              ...requiredFixture(journalFixture[2], 'donnée HTTP de résolution'),
              id: '70000000-0000-0000-0000-000000000011',
              dateDeSurvenue: instantLocalFixture(new Date(2026, 8, 14, 9, 0)),
            },
            {
              ...requiredFixture(journalFixture[2], 'donnée HTTP de résolution'),
              id: '70000000-0000-0000-0000-000000000012',
              dateDeSurvenue: instantLocalFixture(new Date(2026, 8, 14, 10, 0)),
            },
            {
              ...requiredFixture(journalFixture[2], 'donnée HTTP de résolution'),
              id: '70000000-0000-0000-0000-000000000013',
              dateDeSurvenue: instantLocalFixture(new Date(2026, 8, 14, 10, 0)),
            },
          ],
        },
      } satisfies components['schemas']['RestDossierAnomalie'],
    });
    cy.visit(`/anomalies/${suiviFixture}?pointage=${finFixture}`);
  };

  const thenTheReceivedFactsFollowTheirOccurrenceTime = (): void => {
    cy.get(dataSelector('anomalie-pointage')).should('have.length', 6);
    cy.get(dataSelector('anomalie-pointage')).eq(1).should('contain.text', 'lundi 14 septembre à 09:00:00');
    cy.get(dataSelector('anomalie-pointage')).eq(2).should('contain.text', 'lundi 14 septembre à 10:00:00');
    cy.get(dataSelector('anomalie-pointage')).eq(3).should('contain.text', 'lundi 14 septembre à 10:00:00');
  };

  it('should offer an explicit detailed correction and preserve the received precision', () => {
    whenOpeningTheDossier();
    whenCorrectingTheEnd();

    thenTheDetailedFactPreservesTheReceivedValues();
  });

  it('should send the received instant untouched, nanoseconds included, when only the reason is entered', () => {
    whenOpeningTheDossier();
    whenCorrectingTheEnd();
    whenGivingTheReason();
    whenRequestingThePreview();

    thenThePreviewedActCarries(instantFinFixture);
  });

  it('should open the calendar in French on the month of the received instant, starting on Monday', () => {
    whenOpeningTheDossier();
    whenCorrectingTheEnd();
    whenOpeningTheCalendar();

    thenTheCalendarIsInFrenchOnTheReceivedMonthStartingOnMonday();
  });

  const whenOpeningTheCalendar = (): void => {
    cy.get(dataSelector('anomalie-instant-calendrier')).find('button').click();
  };

  const thenTheCalendarIsInFrenchOnTheReceivedMonthStartingOnMonday = (): void => {
    cy.get('.mat-calendar-period-button')
      .invoke('text')
      .should('match', /sept\. 2026/i);
    cy.get('.mat-calendar-table-header th').first().should('contain.text', 'L');
  };

  it('should choose the day in the calendar and the hour in the time list', () => {
    whenOpeningTheDossier();
    whenCorrectingTheEnd();
    whenGivingTheReason();
    whenChoosingTheDayInTheCalendar('15 septembre 2026');
    whenChoosingTheHourInTheList('18:30');
    whenRequestingThePreview();

    thenThePreviewedActCarries(instantLocalWithOffsetFixture(new Date(2026, 8, 15, 18, 30)));
  });

  const whenGivingTheReason = (): void => {
    cy.get(dataSelector('anomalie-motif')).type('La cible est la NC.');
  };

  const whenChoosingTheDayInTheCalendar = (day: string): void => {
    whenOpeningTheCalendar();
    cy.get('.mat-datepicker-content').should(popup => expect(popup[0]?.getAnimations()).to.have.length(0));
    cy.get(`.mat-calendar-body-cell[aria-label="${day}"]`).click();
    cy.get('.mat-calendar').should('not.exist');
  };

  const whenChoosingTheHourInTheList = (hour: string): void => {
    cy.get(dataSelector('anomalie-instant-horloge')).find('button').click();
    cy.contains('mat-option', hour).click();
  };

  const thenThePreviewedActCarries = (instant: string): void => {
    cy.wait('@apercu').its('request.body.acte.fait.instant').should('equal', instant);
  };

  it('should ask for the missing fact without choosing a type or intention or requesting a reason', () => {
    whenOpeningTheDossier();
    whenRegularisingAMissingFact();

    thenTheMissingFactRequiresAnExplicitDecision();
  });

  it('should require a reason for a deliberate cancellation without asking to alter the original fact', () => {
    whenOpeningTheDossier();
    whenCancellingTheEnd();

    thenTheCancellationOnlyRequiresAReason();
  });

  it('should start reading the preview at its summary before reaching confirmation', () => {
    whenOpeningTheDossier();
    whenPreparingTheGuidedCorrection();

    thenThePreviewSummaryHasKeyboardFocus();
  });

  it('should keep a guided decision focused on its reason while allowing explicit access to fact editing', () => {
    whenOpeningTheDossier();
    whenChoosingTheGuidedCorrection();

    thenTheGuidedFactIsCollapsedAndTheReasonIsVisible();
  });

  const thenTheGuidedFactIsCollapsedAndTheReasonIsVisible = (): void => {
    cy.get(dataSelector('anomalie-fait-propose')).should('not.have.attr', 'open');
    cy.get(dataSelector('anomalie-motif')).should('be.visible');
    cy.get(dataSelector('anomalie-champs-detail')).should('be.visible');
  };

  it('should invalidate the preview when the reason is edited', () => {
    whenOpeningTheDossier();
    whenPreparingTheGuidedCorrection();
    whenChangingTheReason();

    thenTheFormerPreviewCannotBeConfirmed();
  });

  it('should retain the proposal and require a new preview after a concurrent modification', () => {
    whenOpeningTheDossier();
    whenPreparingTheGuidedCorrection();
    givenAnObsoleteConfirmation();
    whenConfirmingTheAct();

    thenTheConcurrentDossierIsReloadedWithTheProposal();
  });

  it('should verify the written journal after a lost response without replaying the act', () => {
    whenOpeningTheDossier();
    whenPreparingTheGuidedCorrection();
    givenALostConfirmation();
    whenConfirmingTheAct();
    whenVerifyingTheJournal();

    thenTheWrittenActRemainsVisibleInHistory();
  });

  it('should allow consultation while reserving all decisions to managers', () => {
    whenConsultingWithoutManagementRights();
    whenOpeningTheDetailedControls();

    thenTheDossierCanOnlyBeRead();
  });

  [320, 1024, 1280].forEach(width => {
    it(`should keep the dossier and its controls reachable at ${width} pixels`, () => {
      whenOpeningTheDossierAt(width);
      whenCapturingTheInitialDossier(width);
      whenPreparingTheGuidedCorrection();
      whenCapturingTheDossier(width);

      thenThePageHasNoHorizontalOverflow();
      thenTheConfirmationHasAnAdequateTouchTarget();
    });
  });

  const whenCapturingTheDossier = (width: number): void => {
    cy.get(dataSelector('anomalie-apercu')).scrollIntoView();
    cy.screenshot(`anomalies-dossier-${width}`, { capture: 'viewport' });
  };

  const whenCapturingTheInitialDossier = (width: number): void => {
    cy.get(dataSelector('anomalie-pointage')).should('have.length', 3);
    cy.screenshot(`anomalies-entree-${width}`, { capture: 'viewport' });
  };

  const thenTheConfirmationHasAnAdequateTouchTarget = (): void => {
    cy.get(dataSelector('anomalie-confirmer')).should($button => {
      expect($button[0]?.getBoundingClientRect().height).to.be.at.least(44);
    });
  };

  const thenThePageHasNoHorizontalOverflow = (): void => {
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth).to.equal(document.documentElement.clientWidth);
    });
  };

  const whenConsultingWithoutManagementRights = (): void => {
    cy.visit(`/anomalies/${suiviFixture}?pointage=${finFixture}`, {
      onBeforeLoad: win => {
        win.gestionAnomaliesGestionnaire = false;
      },
    });
  };

  const whenOpeningTheDetailedControls = (): void => {
    cy.get(dataSelector('anomalie-detail')).click();
  };

  const thenTheDossierCanOnlyBeRead = (): void => {
    cy.get(dataSelector('anomalie-droits')).should('contain.text', 'gestionnaires');
    cy.get(dataSelector('anomalie-pointage')).should('have.length', 3);
    cy.get(dataSelector('anomalie-choix')).should('be.disabled');
    cy.get(dataSelector('anomalie-corriger')).should('be.disabled');
    cy.get(dataSelector('anomalie-annuler')).should('be.disabled');
    cy.get(dataSelector('anomalie-regulariser')).should('be.disabled');
  };

  const givenAnObsoleteConfirmation = (): void => {
    cy.intercept('POST', `/api/atelier/suivis/${suiviFixture}/confirmations-de-resolution`, {
      statusCode: 409,
      body: { type: 'urn:glm:erreur:atelier:apercu-obsolete', message: 'Conséquences modifiées' },
    });
    cy.intercept('GET', `/api/atelier/suivis/${suiviFixture}/anomalies/${finFixture}`, { body: { ...dossierRecuFixture(), revision: 4 } });
  };

  const givenALostConfirmation = (): void => {
    cy.intercept('POST', `/api/atelier/suivis/${suiviFixture}/confirmations-de-resolution`, {
      statusCode: 500,
      body: { type: 'urn:glm:erreur:atelier:issue-inconnue', message: 'Réponse perdue' },
    }).as('confirmationPerdue');
  };

  const whenConfirmingTheAct = (): void => {
    cy.get(dataSelector('anomalie-confirmer')).click();
  };

  const whenVerifyingTheJournal = (): void => {
    cy.wait('@confirmationPerdue').then(interception => {
      const body = interception.request.body as components['schemas']['RestConfirmationAEnregistrer'];
      const confirmation = confirmationFixture(body.commande);
      cy.intercept('GET', `/api/atelier/suivis/${suiviFixture}/confirmations-de-resolution/${body.commande}`, {
        body: { ...confirmation, recu: { ...confirmation.recu, acte: body.acte }, dossier: dossierApresFixture() },
      });
    });
    cy.get(dataSelector('anomalie-verifier')).click();
  };

  const thenTheWrittenActRemainsVisibleInHistory = (): void => {
    cy.get(dataSelector('anomalie-operation')).should('contain.text', 'Acte enregistré');
    cy.get(dataSelector('anomalie-resultat')).should('contain.text', 'Anomalie traitée');
    cy.get(dataSelector('anomalie-adresse-obsolete')).should('not.exist');
    cy.get(dataSelector('anomalie-pointage')).should('contain.text', `Remplace le pointage ${finFixture}`);
    cy.get(dataSelector('anomalie-pointage')).should('contain.text', `Crée l’activité ${debutFixture}`);
    cy.get(dataSelector('anomalie-pointage')).should('contain.text', ncFixture);
    cy.get(dataSelector('anomalie-annulation')).should('have.length', 1).and('contain.text', 'La cible est la NC.');
    cy.get(dataSelector('anomalie-pointage')).should('have.length', 4);
    cy.get(dataSelector('anomalie-confirmer')).should('not.exist');
  };

  const thenTheConcurrentDossierIsReloadedWithTheProposal = (): void => {
    cy.get(dataSelector('anomalie-operation')).should('contain.text', 'Les données ont changé');
    cy.get(dataSelector('anomalie-motif')).should('have.value', 'La cible est la NC.');
    cy.get(dataSelector('anomalie-confirmer')).should('not.exist');
    cy.get(dataSelector('anomalie-pointage')).should('have.length', 3);
    cy.get(dataSelector('anomalie-previsualiser')).should('be.enabled');
  };

  const whenRequestingThePreview = (): void => {
    cy.get(dataSelector('anomalie-previsualiser')).click();
  };

  const whenChangingTheReason = (): void => {
    cy.get(dataSelector('anomalie-motif')).type(' Motif précisé.');
  };

  const thenTheFormerPreviewCannotBeConfirmed = (): void => {
    cy.get(dataSelector('anomalie-apercu')).should('not.exist');
    cy.get(dataSelector('anomalie-confirmer')).should('not.exist');
    cy.get(dataSelector('anomalie-pointage')).should('have.length', 3);
  };

  const thenThePreviewSummaryHasKeyboardFocus = (): void => {
    cy.get(dataSelector('anomalie-apercu-titre')).should('have.focus');
  };

  const whenPreparingTheGuidedCorrection = (): void => {
    whenChoosingTheGuidedCorrection();
    whenRequestingThePreview();
  };

  const whenChoosingTheGuidedCorrection = (): void => {
    cy.get(dataSelector('anomalie-choix')).first().click();
    cy.get(dataSelector('anomalie-motif')).type('La cible est la NC.');
  };

  const whenOpeningTheDossier = (): void => {
    whenOpeningTheDossierAt(1280);
  };

  const whenOpeningTheDossierAt = (width: number): void => {
    cy.viewport(width, 900);
    cy.visit(`/anomalies/${suiviFixture}?pointage=${finFixture}`);
  };

  const whenCorrectingTheEnd = (): void => {
    cy.get(dataSelector('anomalie-corriger')).last().click();
  };

  const whenRegularisingAMissingFact = (): void => {
    cy.get(dataSelector('anomalie-detail')).click();
    cy.get(dataSelector('anomalie-regulariser')).click();
  };

  const whenCancellingTheEnd = (): void => {
    cy.get(dataSelector('anomalie-annuler')).last().click();
  };

  const thenTheCancellationOnlyRequiresAReason = (): void => {
    cy.get(dataSelector('anomalie-acte')).should('contain.text', 'Annulation');
    cy.get(dataSelector('anomalie-motif')).should('have.value', '');
    cy.get(dataSelector('anomalie-instant-date')).should('not.exist');
    cy.get(dataSelector('anomalie-instant-heure')).should('not.exist');
    cy.get(dataSelector('anomalie-previsualiser')).should('be.disabled');
  };

  const thenTheMissingFactRequiresAnExplicitDecision = (): void => {
    cy.get('input[name="type-acte"]:checked').should('not.exist');
    cy.get('input[name="intention-acte"]:checked').should('not.exist');
    thenTheInstantFieldsAreEmpty();
    cy.get(dataSelector('anomalie-motif')).should('not.exist');
    cy.get(dataSelector('anomalie-previsualiser')).should('be.disabled');
    cy.get(dataSelector('anomalie-validation')).should('contain.text', 'Choisissez le type');
  };

  const thenTheDetailedFactPreservesTheReceivedValues = (): void => {
    thenTheInstantFieldsShow(instantFinLocalFixture);
    cy.get(dataSelector('anomalie-operateur')).should('have.value', operateurFixture);
    cy.get(dataSelector('anomalie-cible')).should('have.value', debutFixture);
    cy.get(dataSelector('anomalie-previsualiser')).should('be.disabled');
    cy.get(dataSelector('anomalie-confirmer')).should('not.exist');
  };

  const givenTheClockOnAFixedDay = (): void => {
    cy.clock(new Date(2026, 9, 5, 10, 0).getTime(), ['Date']);
  };
});
