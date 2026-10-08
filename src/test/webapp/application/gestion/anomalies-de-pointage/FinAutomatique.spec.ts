import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';
import { abscisseDeLHeure } from '../../../utils/gestion/anomalies-de-pointage/AbscisseSurLaFrise';
import {
  activiteFinAutomatiqueFixture,
  apercuFixture,
  confirmationFinAutomatiqueFixture,
  dossierApresCorrectionFixture,
  dossierApresRegularisationFixture,
  dossierDeuxFinsAutomatiquesFixture,
  dossierFinAutomatiqueFixture,
  dossierFinTardiveFixture,
  dossierFinTardiveLeLendemainFixture,
  finCorrigeeFixture,
  finRegulariseeFixture,
  finTardiveFixture,
  givenTheReferentielFinAutomatique,
  instantRegulariseLocalFixture,
  instantRegulariseSaisiFixture,
  instantTardifFixture,
  instantTardifLocalFixture,
  motifFinAutomatiqueFixture,
  operateurFinAutomatiqueFixture,
  ouvrantFinAutomatiqueFixture,
  ouvrantSuivantFixture,
  posteFinAutomatiqueFixture,
  suiviFinAutomatiqueFixture,
} from '../../../utils/gestion/anomalies-de-pointage/FinAutomatiqueHttp.fixture';
import {
  CHAMP_DE_LA_VUE_DE_RESOLUTION,
  thenTheInstantFieldsAreEmpty,
  thenTheInstantFieldsShow,
  whenTypingTheInstant,
} from '../../../utils/gestion/anomalies-de-pointage/InstantField';
import {
  givenTheHoursOfTheOperator,
  thenTheHoursOpenOnTheDay,
  whenFollowingTheLinkToTheDayOfTheOperator,
} from '../../../utils/gestion/anomalies-de-pointage/JourneeDeLOperateur';
import {
  thenActivityIsSelected,
  whenSelectingActivity,
  whenSelectingPointage,
} from '../../../utils/gestion/anomalies-de-pointage/SelectionDuPointage';

const urlDossier = `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`;
const urlApercu = `${urlDossier}/apercus`;
const urlConfirmation = `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/confirmations-de-resolution`;

const messageAvecIdentifiantsFixture =
  'L’operateur 10000000-0000-0000-0000-000000000001 n’est pas habilite sur le poste de travail 20000000-0000-0000-0000-000000000002';

const refusFixture = [
  {
    statut: 409,
    code: 'suivi-d-atelier-cloture',
    message: 'Le suivi d’atelier 30000000-0000-0000-0000-000000000003 est clôturé',
    libelle: 'Ce suivi d’atelier est clôturé : il n’accepte plus de décision.',
  },
  {
    statut: 409,
    code: 'operateur-non-habilite',
    message: messageAvecIdentifiantsFixture,
    libelle: 'L’opérateur indiqué n’est pas habilité sur ce poste.',
  },
  {
    statut: 400,
    code: 'date-de-survenue-future',
    message: 'La date de survenue est dans le futur',
    libelle: 'La date et l’heure du fait ne peuvent pas être dans le futur.',
  },
];

describe('Automatic end of an activity in Gestion', () => {
  beforeEach(() => {
    givenTheClockOnAFixedDay();
    givenTheReferentielFinAutomatique();
  });

  it('should regularise an automatic end from its resolution view through preview, validation and receipt', () => {
    givenAnAutomaticEndRegularisedByTheBackend();

    whenOpeningTheAutomaticEnd();
    whenPlacingTheEndByTyping();
    whenValidatingTheEndRegularisation();

    thenTheAnomalyIsProcessedFromTheReceipt();
  });

  it('should invent no hour and keep the validation unavailable until the manager places the end on the frise', () => {
    givenAnAutomaticEndRegularisedByTheBackend();

    whenOpeningTheAutomaticEnd();

    thenNoHourIsInventedAndTheValidationIsUnavailable();
  });

  it('should regularise an automatic end by placing its real end on the frise', () => {
    givenAnAutomaticEndRegularisedByTheBackend();

    whenOpeningTheAutomaticEnd();
    whenClickingTheBarAt(instantRegulariseLocalFixture);

    thenThePreviewWasAskedForTheClickedHour();
  });

  it('should leave to the full view of the automatic end, through the other correction, and regularise it there', () => {
    givenAnAutomaticEndRegularisedByTheBackend();

    whenOpeningTheAutomaticEnd();
    whenAskingForAnotherCorrection();
    whenChoosingTheEndRegularisationInTheFullView();
    whenDatingTheEndInTheFullView();
    whenPreviewingTheEndRegularisationInTheFullView();
    whenConfirmingTheEndRegularisation();
    whenSelectingActivity(activiteFinAutomatiqueFixture);

    thenTheAnomalyIsProcessedFromTheReceiptInTheFullView();
  });

  const thenNoHourIsInventedAndTheValidationIsUnavailable = (): void => {
    thenTheInstantFieldsAreEmpty(CHAMP_DE_LA_VUE_DE_RESOLUTION);
    cy.get(dataSelector('anomalie-poignee')).should('have.attr', 'data-sans-heure');
    cy.get(dataSelector('anomalie-resolution-valider')).should('be.disabled');
    cy.get(dataSelector('anomalie-frise-aide')).should('be.visible');
  };

  const whenClickingTheBarAt = (instant: Date): void => {
    const heures = instant.getHours() + instant.getMinutes() / 60;
    cy.get(dataSelector('anomalie-frise-placement')).then(elements => {
      const { left } = requiredFixture(elements[0], 'rangée de placement').getBoundingClientRect();
      abscisseDeLHeure(heures).then(clientX => {
        cy.get(dataSelector('anomalie-frise-placement')).click(clientX - left, 20);
      });
    });
  };

  const thenThePreviewWasAskedForTheClickedHour = (): void => {
    thenTheInstantFieldsShow(instantRegulariseLocalFixture, CHAMP_DE_LA_VUE_DE_RESOLUTION);
    cy.get(dataSelector('anomalie-poignee')).should('be.visible').and('not.have.attr', 'data-sans-heure');
    cy.wait('@apercu').its('request.body.acte.fait.instant').should('eq', instantRegulariseSaisiFixture);
  };

  const givenAnAutomaticEndRegularisedByTheBackend = (): void => {
    cy.intercept('GET', urlDossier, { body: dossierFinAutomatiqueFixture() }).as('dossier');
    cy.intercept('POST', urlApercu, request => {
      const demande = request.body as components['schemas']['RestDemandeDApercu'];
      request.reply({
        body: apercuFixture(demande, dossierFinAutomatiqueFixture(), dossierApresRegularisationFixture(), finRegulariseeFixture),
      });
    }).as('apercu');
    cy.intercept('POST', urlConfirmation, request => {
      const demande = request.body as components['schemas']['RestConfirmationAEnregistrer'];
      request.reply({ body: confirmationFinAutomatiqueFixture(demande, dossierApresRegularisationFixture()) });
    }).as('confirmation');
  };

  const whenOpeningTheAutomaticEnd = (): void => {
    cy.visit(`/anomalies/${suiviFinAutomatiqueFixture}?pointage=${ouvrantFinAutomatiqueFixture}`);
  };

  const whenPlacingTheEndByTyping = (): void => {
    cy.get(dataSelector('anomalie-probleme'))
      .should('have.length', 1)
      .and('have.text', 'Le travail démarré à 08:00 n’a jamais été arrêté : fin automatique à 21:00.');
    thenTheInstantFieldsAreEmpty(CHAMP_DE_LA_VUE_DE_RESOLUTION);
    cy.get(dataSelector('anomalie-resolution-valider')).should('be.disabled');
    whenTypingTheInstant(instantRegulariseLocalFixture, CHAMP_DE_LA_VUE_DE_RESOLUTION);
    cy.get(dataSelector('anomalie-resolution-apercu')).should('have.text', 'Travail 13 h → 9 h · anomalie traitée');
    cy.get(dataSelector('anomalie-resolution-valider')).should('be.enabled').and('contain.text', 'Valider la fin à 17:00');
  };

  const whenValidatingTheEndRegularisation = (): void => {
    cy.get(dataSelector('anomalie-resolution-valider')).click();
  };

  const whenAskingForAnotherCorrection = (): void => {
    cy.get(dataSelector('anomalie-resolution-autre-correction')).click();
  };

  const whenChoosingTheEndRegularisationInTheFullView = (): void => {
    cy.get(dataSelector('anomalie-selection'))
      .should('contain.text', 'Début lundi 14 septembre à 08:00')
      .and('contain.text', 'Fin lundi 14 septembre à 21:00')
      .and('contain.text', 'Fin automatique · 13 h');
    thenActivityIsSelected(activiteFinAutomatiqueFixture);
    cy.get(dataSelector('anomalie-choix')).should('have.length', 1).and('contain.text', 'Régulariser la fin').click();
  };

  const whenDatingTheEndInTheFullView = (): void => {
    thenTheInstantFieldsAreEmpty();
    cy.get(dataSelector('anomalie-validation')).should('contain.text', 'Renseignez la date et l’heure du fait.');
    cy.get(dataSelector('anomalie-previsualiser')).should('be.disabled');
    whenTypingTheInstant(instantRegulariseLocalFixture);
    cy.get(dataSelector('anomalie-validation')).should('not.contain.text', 'Renseignez la date et l’heure du fait.');
    cy.get(dataSelector('anomalie-choix')).should('have.attr', 'aria-pressed', 'true');
  };

  const whenPreviewingTheEndRegularisationInTheFullView = (): void => {
    cy.get(dataSelector('anomalie-previsualiser')).click();
    cy.get(dataSelector('anomalie-activite'))
      .filter(`[data-activite="${activiteFinAutomatiqueFixture}"]`)
      .should('have.attr', 'aria-label')
      .and('contain', 'Terminée · 9 h');
    cy.get(dataSelector('anomalie-apercu')).should('contain.text', 'Après cet acte : anomalie traitée');
  };

  const whenConfirmingTheEndRegularisation = (): void => {
    cy.get(dataSelector('anomalie-confirmer')).click();
  };

  const thenTheRegularisationWasAskedAndConfirmed = (): void => {
    cy.wait('@apercu')
      .its('request.body.acte')
      .should('deep.equal', {
        kind: 'REGULARISATION',
        fait: {
          type: 'FIN',
          intention: 'FIN',
          activiteVisee: activiteFinAutomatiqueFixture,
          operateur: operateurFinAutomatiqueFixture,
          poste: posteFinAutomatiqueFixture,
          instant: instantRegulariseSaisiFixture,
        },
      });
    cy.wait('@confirmation')
      .its('request.body')
      .should('deep.include', {
        adresse: { suivi: suiviFinAutomatiqueFixture, pointage: ouvrantFinAutomatiqueFixture },
        revision: 0,
        empreinteConsequences: 'empreinte-fin-automatique',
        evenement: finRegulariseeFixture,
      });
  };

  const thenTheAnomalyIsProcessedFromTheReceipt = (): void => {
    cy.get(dataSelector('anomalie-resultat')).should('contain.text', 'Anomalie traitée');
    cy.get(dataSelector('anomalie-probleme')).should('not.exist');
    cy.get(dataSelector('anomalie-pointage')).should('have.length', 2);
    cy.get(dataSelector('anomalie-activite'))
      .filter(`[data-activite="${activiteFinAutomatiqueFixture}"]`)
      .should('have.attr', 'aria-label')
      .and('contain', 'Terminée')
      .and('not.contain', 'heure proposée');
    cy.get(dataSelector('anomalie-poignee')).should('not.exist');
    cy.get(dataSelector('anomalie-resolution-valider')).should('not.exist');
    cy.get(dataSelector('anomalie-resolution-instant-date')).should('not.exist');
    cy.get(dataSelector('anomalie-resolution-autre-correction')).should('not.exist');
    thenTheRegularisationWasAskedAndConfirmed();
  };

  const thenTheAnomalyIsProcessedFromTheReceiptInTheFullView = (): void => {
    cy.get(dataSelector('anomalie-resultat')).should('contain.text', 'Anomalie traitée');
    cy.get(dataSelector('anomalie-probleme')).should('not.exist');
    cy.get(dataSelector('anomalie-pointage')).should('have.length', 2);
    cy.get(dataSelector('anomalie-selection')).should('contain.text', 'Terminée · 9 h');
    cy.get(dataSelector('anomalie-confirmer')).should('not.exist');
    thenTheRegularisationWasAskedAndConfirmed();
  };

  it('should regularise the end of an activity without workstation without naming one', () => {
    givenAnActivityWithoutWorkstationRegularisedByTheBackend();

    whenOpeningTheAutomaticEnd();
    whenPlacingTheEndByTypingWithoutWorkstation();

    thenTheRegularisationNamesNoWorkstation();
  });

  const whenPlacingTheEndByTypingWithoutWorkstation = (): void => {
    whenTypingTheInstant(instantRegulariseLocalFixture, CHAMP_DE_LA_VUE_DE_RESOLUTION);
    cy.get(dataSelector('anomalie-resolution-valider')).should('be.enabled');
  };

  const givenAnActivityWithoutWorkstationRegularisedByTheBackend = (): void => {
    cy.intercept('GET', urlDossier, { body: dossierFinAutomatiqueFixture(true) });
    cy.intercept('POST', urlApercu, request => {
      const demande = request.body as components['schemas']['RestDemandeDApercu'];
      request.reply({
        body: apercuFixture(demande, dossierFinAutomatiqueFixture(true), dossierApresRegularisationFixture(true), finRegulariseeFixture),
      });
    }).as('apercu');
  };

  const thenTheRegularisationNamesNoWorkstation = (): void => {
    cy.get('@apercu.all').should('have.length', 1);
    cy.wait('@apercu').its('request.body.acte.fait').should('not.have.property', 'poste');
  };

  it('should correct the end pointed after the due time with its own time and a reason', () => {
    givenALateEndCorrectedByTheBackend();

    whenOpeningTheAutomaticEnd();
    whenChoosingTheLateEndCorrection();
    whenGivingTheReasonOfTheCorrection();
    whenPreviewingTheCorrection();
    whenConfirmingTheEndRegularisation();
    whenSelectingPointage(finTardiveFixture);

    thenTheCorrectionIsProcessedFromTheReceipt();
  });

  it('should say in one sentence which pointage came after the due time', () => {
    givenALateEndCorrectedByTheBackend();

    whenOpeningTheAutomaticEnd();

    thenTheLateEndIsSaid();
  });

  it('should open the hours of the operator on the day of the pointage pointed after the due time, the next day', () => {
    givenALateEndPointedTheNextDay();
    const synthese = givenTheHoursOfTheOperator();

    whenOpeningTheAutomaticEnd();
    whenFollowingTheLinkToTheDayOfTheOperator();

    thenTheHoursOpenOnTheDay(synthese, { annee: '2026', semaine: '38' }, 'mar. 15');
  });

  const givenALateEndPointedTheNextDay = (): void => {
    cy.intercept('GET', urlDossier, { body: dossierFinTardiveLeLendemainFixture() });
  };

  const givenALateEndCorrectedByTheBackend = (): void => {
    cy.intercept('GET', urlDossier, { body: dossierFinTardiveFixture() });
    cy.intercept('POST', urlApercu, request => {
      const demande = request.body as components['schemas']['RestDemandeDApercu'];
      request.reply({
        body: apercuFixture(demande, dossierFinTardiveFixture(), dossierApresCorrectionFixture(), finCorrigeeFixture),
      });
    }).as('apercu');
    cy.intercept('POST', urlConfirmation, request => {
      const demande = request.body as components['schemas']['RestConfirmationAEnregistrer'];
      request.reply({ body: confirmationFinAutomatiqueFixture(demande, dossierApresCorrectionFixture()) });
    }).as('confirmation');
  };

  const thenTheLateEndIsSaid = (): void => {
    cy.get(dataSelector('anomalie-probleme'))
      .should('have.length', 1)
      .and('have.text', 'L’arrêt de 23:00 vise le travail, déjà terminé automatiquement à 21:00.');
  };

  const whenChoosingTheLateEndCorrection = (): void => {
    cy.get(dataSelector('anomalie-choix')).should('contain.text', 'Corriger la fin pointée après l’échéance').click();
    thenTheInstantFieldsShow(instantTardifLocalFixture);
    cy.get(dataSelector('anomalie-previsualiser')).should('be.disabled');
  };

  const whenGivingTheReasonOfTheCorrection = (): void => {
    cy.get(dataSelector('anomalie-motif')).type(motifFinAutomatiqueFixture);
  };

  const whenPreviewingTheCorrection = (): void => {
    cy.get(dataSelector('anomalie-previsualiser')).click();
    cy.get(dataSelector('anomalie-apercu-activite-apres')).should('have.attr', 'aria-label').and('contain', 'Terminée · 15 h');
  };

  const thenTheCorrectionIsProcessedFromTheReceipt = (): void => {
    cy.get(dataSelector('anomalie-resultat')).should('contain.text', 'Anomalie traitée');
    cy.get(dataSelector('anomalie-probleme')).should('not.exist');
    cy.get(dataSelector('anomalie-pointage')).should('have.length', 3);
    cy.get(dataSelector('anomalie-annulation')).should('have.length', 1).and('contain.text', motifFinAutomatiqueFixture);
    cy.wait('@apercu')
      .its('request.body.acte')
      .should('deep.equal', {
        kind: 'CORRECTION',
        pointage: finTardiveFixture,
        motif: motifFinAutomatiqueFixture,
        fait: {
          type: 'FIN',
          intention: 'FIN',
          activiteVisee: activiteFinAutomatiqueFixture,
          operateur: operateurFinAutomatiqueFixture,
          poste: posteFinAutomatiqueFixture,
          instant: instantTardifFixture,
        },
      });
  };

  it('should offer the correction of a transition pointed after the due time instead of an end regularisation', () => {
    givenALateTransition();

    whenOpeningTheAutomaticEnd();

    thenOnlyTheLateTransitionCorrectionIsOffered();
  });

  const givenALateTransition = (): void => {
    cy.intercept('GET', urlDossier, { body: dossierFinTardiveFixture('CORRIGER_TRANSITION_TARDIVE') });
  };

  const thenOnlyTheLateTransitionCorrectionIsOffered = (): void => {
    cy.get(dataSelector('anomalie-choix'))
      .should('have.length', 1)
      .and('contain.text', 'Corriger la transition pointée après l’échéance')
      .and('not.contain.text', 'Régulariser la fin');
  };

  refusFixture.forEach(({ statut, code, message, libelle }) => {
    it(`should keep the dated end and show the known refusal ${code} of the preview`, () => {
      givenAPreviewRefusedWith(statut, code, message);

      whenOpeningTheAutomaticEnd();
      whenTypingTheEnd();

      thenTheRefusalIsExplainedAndTheEndIsKept(libelle);
    });
  });

  const givenAPreviewRefusedWith = (statut: number, code: string, message: string): void => {
    cy.intercept('GET', urlDossier, { body: dossierFinAutomatiqueFixture() });
    cy.intercept('POST', urlApercu, { statusCode: statut, body: { type: `urn:glm:erreur:atelier:${code}`, message } });
  };

  const whenTypingTheEnd = (): void => {
    whenTypingTheInstant(instantRegulariseLocalFixture, CHAMP_DE_LA_VUE_DE_RESOLUTION);
  };

  const thenTheRefusalIsExplainedAndTheEndIsKept = (libelle: string): void => {
    cy.get(dataSelector('anomalie-operation')).should('contain.text', 'Acte refusé');
    cy.get(dataSelector('anomalie-refus'))
      .should('contain.text', libelle)
      .and('not.match', /[0-9a-f]{8}-[0-9a-f]{4}-/i);
    cy.get(dataSelector('anomalie-resolution-apercu')).should('not.exist');
    cy.get(dataSelector('anomalie-resolution-valider')).should('be.disabled');
    thenTheInstantFieldsShow(instantRegulariseLocalFixture, CHAMP_DE_LA_VUE_DE_RESOLUTION);
    cy.get(dataSelector('anomalie-probleme')).should('be.visible');
  };

  it('should reacquire the dossier after an obsolete confirmation and preview the same end again by itself', () => {
    givenAConfirmationWhoseConsequencesBecameObsolete();

    whenOpeningTheAutomaticEnd();
    whenPlacingTheEndByTyping();
    whenValidatingTheEndRegularisation();

    thenTheSameEndIsPreviewedAgainOnTheCurrentDossier();
  });

  const givenAConfirmationWhoseConsequencesBecameObsolete = (): void => {
    const lectures = [dossierFinAutomatiqueFixture(), { ...dossierFinAutomatiqueFixture(), revision: 1 }];
    let courant = dossierFinAutomatiqueFixture();
    cy.intercept('GET', urlDossier, request => {
      const dossier = lectures.shift();
      if (dossier === undefined) throw new Error('Lecture de dossier fixture inattendue');
      courant = dossier;
      request.reply({ body: dossier });
    }).as('dossierCourant');
    cy.intercept('POST', urlApercu, request => {
      const demande = request.body as components['schemas']['RestDemandeDApercu'];
      request.reply({ body: apercuFixture(demande, courant, dossierApresRegularisationFixture(), finRegulariseeFixture) });
    }).as('apercu');
    cy.intercept('POST', urlConfirmation, {
      statusCode: 409,
      body: { type: 'urn:glm:erreur:atelier:apercu-obsolete', message: 'Les conséquences ont changé' },
    }).as('confirmation');
  };

  const thenTheSameEndIsPreviewedAgainOnTheCurrentDossier = (): void => {
    cy.get('@dossierCourant.all').should('have.length', 2);
    cy.get('@apercu.all').should('have.length', 2);
    thenTheInstantFieldsShow(instantRegulariseLocalFixture, CHAMP_DE_LA_VUE_DE_RESOLUTION);
    cy.get(dataSelector('anomalie-resolution-apercu')).should('be.visible');
    cy.get(dataSelector('anomalie-resolution-valider')).should('be.enabled');
  };

  it('should follow the link to the other automatic end of the element, keeping the way back to the list', () => {
    givenTwoAutomaticEndsOnTheElement();

    whenOpeningTheFirstOfTwoAutomaticEndsFromTheList();
    whenFollowingTheLinkToTheOtherAutomaticEnd();

    thenTheOtherAutomaticEndIsOpenedWithItsOwnResolutionView();
  });

  const givenTwoAutomaticEndsOnTheElement = (): void => {
    cy.intercept('GET', urlDossier, { body: dossierDeuxFinsAutomatiquesFixture() });
    cy.intercept('GET', `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantSuivantFixture}`, {
      body: dossierDeuxFinsAutomatiquesFixture('SUIVANTE'),
    });
  };

  const whenOpeningTheFirstOfTwoAutomaticEndsFromTheList = (): void => {
    cy.visit(`/anomalies/${suiviFinAutomatiqueFixture}?nature=FIN_AUTOMATIQUE&page=2&pointage=${ouvrantFinAutomatiqueFixture}`);
  };

  const whenFollowingTheLinkToTheOtherAutomaticEnd = (): void => {
    cy.get(dataSelector('anomalie-resolution-autre-fin')).should('contain.text', '1 autre fin automatique sur cet élément').click();
  };

  const thenTheOtherAutomaticEndIsOpenedWithItsOwnResolutionView = (): void => {
    cy.location('search').should('equal', `?nature=FIN_AUTOMATIQUE&page=2&pointage=${ouvrantSuivantFixture}`);
    cy.get(dataSelector('anomalie-resolution-valider')).should('be.disabled');
    cy.get(dataSelector('anomalie-resolution-autre-fin')).should('contain.text', '1 autre fin automatique sur cet élément');
    cy.get(dataSelector('anomalie-retour')).should('have.attr', 'href').and('contain', 'nature=FIN_AUTOMATIQUE').and('contain', 'page=2');
  };

  const givenTheClockOnAFixedDay = (): void => {
    cy.clock(new Date(2026, 9, 5, 10, 0).getTime(), ['Date']);
  };
});
