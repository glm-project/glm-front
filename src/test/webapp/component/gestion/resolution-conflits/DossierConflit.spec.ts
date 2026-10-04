import { dataSelector } from '../../../utils/DataSelector';
import type {} from '../../../utils/gestion/resolution-conflits/resolution-conflits.provider';

describe('Conflict dossier in Gestion', () => {
  it('should open the correction from the received end and identify the fact being edited', () => {
    whenOpeningTheDossierAt(320);
    whenCorrectingTheReceivedEnd();

    thenTheReceivedEndIsReadyToEdit();
  });

  const whenCorrectingTheReceivedEnd = (): void => {
    cy.get(dataSelector('conflit-pointage')).last().find(dataSelector('conflit-corriger')).click();
  };

  const thenTheReceivedEndIsReadyToEdit = (): void => {
    cy.get(dataSelector('conflit-proposition-titre')).should('have.focus');
    cy.get(dataSelector('conflit-proposition-resume'))
      .should('contain.text', '17:00:00')
      .and('contain.text', 'Travail commencé à 8 h, remplacé à 12 h');
    cy.get(dataSelector('conflit-instant')).should('have.value', '2026-09-14T17:00:00+02:00');
    cy.get(dataSelector('conflit-cible')).should('have.value', 'travail-8');
  };

  it('should identify the chosen interpretation while its reason is being entered', () => {
    whenOpeningTheDossier();
    whenChoosingTheGuidedCorrection();

    thenTheChosenInterpretationIsIdentified();
  });

  const thenTheChosenInterpretationIsIdentified = (): void => {
    cy.get(dataSelector('conflit-choix')).first().should('have.attr', 'aria-pressed', 'true');
    cy.get(dataSelector('conflit-choix')).last().should('have.attr', 'aria-pressed', 'false');
  };

  it('should show the consequences before the optional journal comparison on a narrow screen', () => {
    whenOpeningTheDossierAt(320);
    whenPreparingTheGuidedCorrection();

    thenTheConsequencesAreVisibleWithoutOpeningTheJournal();
  });

  const thenTheConsequencesAreVisibleWithoutOpeningTheJournal = (): void => {
    cy.get(dataSelector('conflit-apercu-consequences'))
      .should('be.visible')
      .and('contain.text', 'Travail de 8 h à 12 h : 4 h.')
      .and('contain.text', 'NC de 12 h à 17 h : 5 h.');
    cy.get(dataSelector('conflit-apercu-journal')).should('not.have.attr', 'open');
    cy.get(dataSelector('conflit-apercu-fait-avant-fin-17')).should(fait => {
      expect(fait[0]?.checkVisibility()).to.equal(false);
    });
    cy.get(dataSelector('conflit-apercu-consequences')).then(consequences => {
      cy.get(dataSelector('conflit-apercu-journal-ouvrir')).should(journal => {
        expect(consequences[0]?.getBoundingClientRect().bottom).to.be.at.most(journal[0]?.getBoundingClientRect().top ?? 0);
      });
    });
    cy.get(dataSelector('conflit-confirmer')).should('be.enabled');
  };

  it('should compare the exact previewed act and its before and after facts before confirmation', () => {
    whenOpeningTheDossier();
    whenPreparingTheGuidedCorrection();
    whenOpeningThePreviewJournal();

    thenThePreviewComparesTheOriginalFactWithItsReplacement();
  });

  const thenThePreviewComparesTheOriginalFactWithItsReplacement = (): void => {
    cy.get(dataSelector('conflit-apercu-acte')).should('contain.text', 'fin-17').and('contain.text', 'La cible est la NC.');
    cy.get(dataSelector('conflit-apercu-fait-avant-fin-17'))
      .should('be.visible')
      .and('contain.text', 'travail-8')
      .and('not.contain.text', 'Pointage annulé');
    cy.get(dataSelector('conflit-apercu-fait-apres-fin-17')).should('contain.text', 'Pointage annulé');
    cy.get(dataSelector('conflit-apercu-fait-apres-fin-17-correction-2'))
      .should('contain.text', 'nc-12')
      .and('contain.text', 'Remplace le pointage fin-17');
    cy.get(dataSelector('conflit-pointage')).should('have.length', 3);
  };

  const whenOpeningThePreviewJournal = (): void => {
    cy.get(dataSelector('conflit-apercu-journal-ouvrir')).click();
  };

  it('should identify an absent workstation while preserving the exact received instant', () => {
    whenOpeningTheDossierWithoutAWorkstation();

    thenTheFactsKeepTheirPrecisionAndNameTheAbsentWorkstation();
  });

  const whenOpeningTheDossierWithoutAWorkstation = (): void => {
    cy.viewport(1280, 900);
    cy.visit('/conflits/demo-avant-ouverture?pointage=fin-avant');
  };

  const thenTheFactsKeepTheirPrecisionAndNameTheAbsentWorkstation = (): void => {
    cy.get(dataSelector('conflit-pointage')).should('contain.text', '2026-09-14T08:00:00.123456789+02:00');
    cy.get(dataSelector('conflit-pointage')).each(pointage => {
      cy.wrap(pointage).should('contain.text', 'Poste : Sans poste');
    });
  };

  it('should identify the operator and workstation of every received fact', () => {
    whenOpeningTheDossier();

    thenEveryFactIdentifiesItsOperatorAndWorkstation();
  });

  const thenEveryFactIdentifiesItsOperatorAndWorkstation = (): void => {
    cy.get(dataSelector('conflit-pointage')).each(pointage => {
      cy.wrap(pointage).should('contain.text', 'Opérateur : op-camille').and('contain.text', 'Poste : poste-dmu');
    });
  };

  it('should display received facts in chronological order while keeping equal instants separate', () => {
    whenOpeningTheRetroactiveDossier();

    thenTheReceivedFactsFollowTheirOccurrenceTime();
  });

  const whenOpeningTheRetroactiveDossier = (): void => {
    cy.viewport(1280, 900);
    cy.visit('/conflits/demo-retroactif?pointage=fin-17');
  };

  const thenTheReceivedFactsFollowTheirOccurrenceTime = (): void => {
    cy.get(dataSelector('conflit-pointage')).should('have.length', 6);
    cy.get(dataSelector('conflit-pointage')).eq(1).should('contain.text', '2026-09-14T09:00:00+02:00');
    cy.get(dataSelector('conflit-pointage')).eq(2).should('contain.text', '2026-09-14T10:00:00+02:00');
    cy.get(dataSelector('conflit-pointage')).eq(3).should('contain.text', '2026-09-14T10:00:00+02:00');
  };

  it('should offer an explicit detailed correction and preserve the received precision', () => {
    whenOpeningTheDossier();
    whenCorrectingTheEnd();

    thenTheDetailedFactPreservesTheReceivedValues();
  });

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

  it('should clear the prepared decision when resetting the demonstration', () => {
    whenOpeningTheDossier();
    whenPreparingTheGuidedCorrection();
    whenResettingTheDemonstration();

    thenTheInitialDossierHasNoPreparedDecision();
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
    cy.get(dataSelector('conflit-fait-propose')).should('not.have.attr', 'open');
    cy.get(dataSelector('conflit-motif')).should('be.visible');
    cy.get(dataSelector('conflit-champs-detail')).should('be.visible');
  };

  it('should invalidate the preview when the reason is edited', () => {
    whenOpeningTheDossier();
    whenPreparingTheGuidedCorrection();
    whenChangingTheReason();

    thenTheFormerPreviewCannotBeConfirmed();
  });

  it('should identify an unsupported valid correction as a simulation limitation and retain the proposal', () => {
    whenOpeningTheDossier();
    whenChoosingTheGuidedCorrection();
    whenMovingTheEndOutsideTheScript();
    whenRequestingThePreview();

    thenTheUnsupportedCorrectionIsRetained();
  });

  it('should preserve the reason and preview when confirmation certainly failed before writing', () => {
    whenOpeningTheDossier();
    whenPreparingTheGuidedCorrection();
    whenArming('PANNE_CONFIRMATION');
    whenConfirmingTheAct();

    thenTheCertainFailureCanBeRetried();
  });

  it('should retain the proposal and require a new preview after a concurrent modification', () => {
    whenOpeningTheDossier();
    whenPreparingTheGuidedCorrection();
    whenArming('CONCURRENCE');
    whenConfirmingTheAct();

    thenTheConcurrentDossierIsReloadedWithTheProposal();
  });

  it('should verify the written journal after a lost response without replaying the act', () => {
    whenOpeningTheDossier();
    whenPreparingTheGuidedCorrection();
    whenArming('ISSUE_INCONNUE');
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
    cy.get(dataSelector('conflit-apercu')).scrollIntoView();
    cy.screenshot(`conflits-dossier-${width}`, { capture: 'viewport' });
  };

  const whenCapturingTheInitialDossier = (width: number): void => {
    cy.get(dataSelector('conflit-pointage')).should('have.length', 3);
    cy.screenshot(`conflits-entree-${width}`, { capture: 'viewport' });
  };

  const thenTheConfirmationHasAnAdequateTouchTarget = (): void => {
    cy.get(dataSelector('conflit-confirmer')).should($button => {
      expect($button[0]?.getBoundingClientRect().height).to.be.at.least(44);
    });
  };

  const thenThePageHasNoHorizontalOverflow = (): void => {
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth).to.equal(document.documentElement.clientWidth);
    });
  };

  const whenConsultingWithoutManagementRights = (): void => {
    cy.visit('/conflits/demo-remplacement?pointage=fin-17', {
      onBeforeLoad: win => {
        win.gestionConflitsGestionnaire = false;
      },
    });
  };

  const whenOpeningTheDetailedControls = (): void => {
    cy.get(dataSelector('conflit-detail')).click();
  };

  const thenTheDossierCanOnlyBeRead = (): void => {
    cy.get(dataSelector('conflit-droits')).should('contain.text', 'gestionnaires');
    cy.get(dataSelector('conflit-pointage')).should('have.length', 3);
    cy.get(dataSelector('conflit-choix')).should('be.disabled');
    cy.get(dataSelector('conflit-corriger')).should('be.disabled');
    cy.get(dataSelector('conflit-annuler')).should('be.disabled');
    cy.get(dataSelector('conflit-regulariser')).should('be.disabled');
  };

  const whenArming = (incident: string): void => {
    cy.get(dataSelector('conflits-demonstration-toggle')).click();
    cy.get(dataSelector(`conflits-incident-${incident}`)).click();
  };

  const whenConfirmingTheAct = (): void => {
    cy.get(dataSelector('conflit-confirmer')).click();
  };

  const whenVerifyingTheJournal = (): void => {
    cy.get(dataSelector('conflit-verifier')).click();
  };

  const thenTheWrittenActRemainsVisibleInHistory = (): void => {
    cy.get(dataSelector('conflit-operation')).should('contain.text', 'Acte enregistré');
    cy.get(dataSelector('conflit-resultat')).should('contain.text', 'Conflit résolu');
    cy.get(dataSelector('conflit-adresse-obsolete')).should('not.exist');
    cy.get(dataSelector('conflit-pointage')).should('contain.text', 'Remplace le pointage fin-17');
    cy.get(dataSelector('conflit-pointage')).should('contain.text', 'Crée l’activité travail-8');
    cy.get(dataSelector('conflit-pointage')).should('contain.text', 'nc-12');
    cy.get(dataSelector('conflit-annulation')).should('have.length', 1).and('contain.text', 'La cible est la NC.');
    cy.get(dataSelector('conflit-pointage')).should('have.length', 4);
    cy.get(dataSelector('conflit-confirmer')).should('not.exist');
  };

  const thenTheConcurrentDossierIsReloadedWithTheProposal = (): void => {
    cy.get(dataSelector('conflit-operation')).should('contain.text', 'Les données ont changé');
    cy.get(dataSelector('conflit-motif')).should('have.value', 'La cible est la NC.');
    cy.get(dataSelector('conflit-confirmer')).should('not.exist');
    cy.get(dataSelector('conflit-pointage')).should('have.length', 3);
    cy.get(dataSelector('conflit-previsualiser')).should('be.enabled');
  };

  const thenTheCertainFailureCanBeRetried = (): void => {
    cy.get(dataSelector('conflit-operation')).should('contain.text', 'Votre saisie est conservée');
    cy.get(dataSelector('conflit-motif')).should('have.value', 'La cible est la NC.');
    cy.get(dataSelector('conflit-confirmer')).should('be.enabled');
    cy.get(dataSelector('conflit-pointage')).should('have.length', 3);
    cy.get(dataSelector('conflit-resultat')).should('not.exist');
  };

  const whenMovingTheEndOutsideTheScript = (): void => {
    cy.get(dataSelector('conflit-champs-detail')).click();
    cy.get(dataSelector('conflit-instant')).clear();
    cy.get(dataSelector('conflit-instant')).type('2026-09-14T17:01:00+02:00');
  };

  const whenRequestingThePreview = (): void => {
    cy.get(dataSelector('conflit-previsualiser')).click();
  };

  const thenTheUnsupportedCorrectionIsRetained = (): void => {
    cy.get(dataSelector('conflit-operation')).should('contain.text', 'Limitation de la démonstration');
    cy.get(dataSelector('conflit-instant')).should('have.value', '2026-09-14T17:01:00+02:00');
    cy.get(dataSelector('conflit-motif')).should('have.value', 'La cible est la NC.');
    cy.get(dataSelector('conflit-confirmer')).should('not.exist');
  };

  const whenChangingTheReason = (): void => {
    cy.get(dataSelector('conflit-motif')).type(' Motif précisé.');
  };

  const thenTheFormerPreviewCannotBeConfirmed = (): void => {
    cy.get(dataSelector('conflit-apercu')).should('not.exist');
    cy.get(dataSelector('conflit-confirmer')).should('not.exist');
    cy.get(dataSelector('conflit-pointage')).should('have.length', 3);
  };

  const thenThePreviewSummaryHasKeyboardFocus = (): void => {
    cy.get(dataSelector('conflit-apercu-titre')).should('have.focus');
  };

  const whenPreparingTheGuidedCorrection = (): void => {
    whenChoosingTheGuidedCorrection();
    whenRequestingThePreview();
  };

  const whenChoosingTheGuidedCorrection = (): void => {
    cy.get(dataSelector('conflit-choix')).first().click();
    cy.get(dataSelector('conflit-motif')).type('La cible est la NC.');
  };

  const whenResettingTheDemonstration = (): void => {
    cy.get(dataSelector('conflits-reset')).click();
  };

  const thenTheInitialDossierHasNoPreparedDecision = (): void => {
    cy.get(dataSelector('conflit-pointage')).should('have.length', 3);
    cy.get(dataSelector('conflit-apercu')).should('not.exist');
    cy.get(dataSelector('conflit-acte')).should('not.exist');
  };

  const whenOpeningTheDossier = (): void => {
    whenOpeningTheDossierAt(1280);
  };

  const whenOpeningTheDossierAt = (width: number): void => {
    cy.viewport(width, 900);
    cy.visit('/conflits/demo-remplacement?pointage=fin-17');
  };

  const whenCorrectingTheEnd = (): void => {
    cy.get(dataSelector('conflit-corriger')).last().click();
  };

  const whenRegularisingAMissingFact = (): void => {
    cy.get(dataSelector('conflit-detail')).click();
    cy.get(dataSelector('conflit-regulariser')).click();
  };

  const whenCancellingTheEnd = (): void => {
    cy.get(dataSelector('conflit-annuler')).last().click();
  };

  const thenTheCancellationOnlyRequiresAReason = (): void => {
    cy.get(dataSelector('conflit-acte')).should('contain.text', 'Annulation');
    cy.get(dataSelector('conflit-motif')).should('have.value', '');
    cy.get(dataSelector('conflit-instant')).should('not.exist');
    cy.get(dataSelector('conflit-previsualiser')).should('be.disabled');
  };

  const thenTheMissingFactRequiresAnExplicitDecision = (): void => {
    cy.get('input[name="type-acte"]:checked').should('not.exist');
    cy.get('input[name="intention-acte"]:checked').should('not.exist');
    cy.get(dataSelector('conflit-instant')).should('have.value', '');
    cy.get(dataSelector('conflit-motif')).should('not.exist');
    cy.get(dataSelector('conflit-previsualiser')).should('be.disabled');
    cy.get(dataSelector('conflit-validation')).should('contain.text', 'Choisissez le type');
  };

  const thenTheDetailedFactPreservesTheReceivedValues = (): void => {
    cy.get(dataSelector('conflit-instant')).should('have.value', '2026-09-14T17:00:00+02:00');
    cy.get(dataSelector('conflit-operateur')).should('have.value', 'op-camille');
    cy.get(dataSelector('conflit-cible')).should('have.value', 'travail-8');
    cy.get(dataSelector('conflit-previsualiser')).should('be.disabled');
    cy.get(dataSelector('conflit-confirmer')).should('not.exist');
  };
});
