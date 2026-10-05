import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import {
  activiteFinAutomatiqueFixture,
  apercuFixture,
  confirmationFinAutomatiqueFixture,
  dossierApresCorrectionFixture,
  dossierApresRegularisationFixture,
  dossierFinAutomatiqueFixture,
  dossierFinTardiveFixture,
  finCorrigeeFixture,
  finRegulariseeFixture,
  finTardiveFixture,
  instantRegulariseLocalFixture,
  instantRegulariseSaisiFixture,
  instantTardifFixture,
  instantTardifLocalFixture,
  motifFinAutomatiqueFixture,
  operateurFinAutomatiqueFixture,
  ouvrantFinAutomatiqueFixture,
  posteFinAutomatiqueFixture,
  suiviFinAutomatiqueFixture,
} from '../../../utils/gestion/anomalies-de-pointage/FinAutomatiqueHttp.fixture';
import {
  thenTheInstantFieldsAreEmpty,
  thenTheInstantFieldsShow,
  whenTypingTheInstant,
} from '../../../utils/gestion/anomalies-de-pointage/InstantField';

const urlDossier = `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`;
const urlApercu = `${urlDossier}/apercus`;
const urlConfirmation = `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/confirmations-de-resolution`;

const refusFixture = [
  { statut: 409, code: 'suivi-d-atelier-cloture', message: 'Le suivi d’atelier est clôturé' },
  { statut: 409, code: 'operateur-non-habilite', message: 'L’opérateur n’est plus habilité sur ce poste' },
  { statut: 400, code: 'date-de-survenue-future', message: 'La date de survenue est dans le futur' },
];

describe('Automatic end of an activity in Gestion', () => {
  beforeEach(() => {
    givenTheClockOnAFixedDay();
  });

  it('should regularise an automatic end from its dossier through preview, confirmation and receipt', () => {
    givenAnAutomaticEndRegularisedByTheBackend();

    whenOpeningTheAutomaticEnd();
    whenChoosingTheEndRegularisation();
    whenDatingTheEnd();
    whenPreviewingTheEndRegularisation();
    whenConfirmingTheEndRegularisation();

    thenTheAnomalyIsProcessedFromTheReceipt();
  });

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

  const whenChoosingTheEndRegularisation = (): void => {
    cy.get(dataSelector('anomalie-fin-automatique-activite'))
      .should('contain.text', 'Début lundi 14 septembre à 08:00')
      .and('contain.text', 'Fin automatique lundi 14 septembre à 21:00')
      .and('contain.text', 'Durée 13 h');
    cy.get(dataSelector('conflit-diagnostic')).should('not.exist');
    cy.get(dataSelector('anomalie-choix')).should('have.length', 1).and('contain.text', 'Régulariser la fin').click();
  };

  const whenDatingTheEnd = (): void => {
    thenTheInstantFieldsAreEmpty();
    cy.get(dataSelector('anomalie-validation')).should('contain.text', 'Renseignez la date et l’heure du fait.');
    cy.get(dataSelector('anomalie-previsualiser')).should('be.disabled');
    whenTypingTheInstant(instantRegulariseLocalFixture);
    cy.get(dataSelector('anomalie-validation')).should('not.contain.text', 'Renseignez la date et l’heure du fait.');
    cy.get(dataSelector('anomalie-choix')).should('have.attr', 'aria-pressed', 'true');
  };

  const whenPreviewingTheEndRegularisation = (): void => {
    cy.get(dataSelector('anomalie-previsualiser')).click();
    cy.get(dataSelector('anomalie-apercu'))
      .should('contain.text', 'Terminée · 9 h')
      .and('contain.text', 'Anomalie traitée après enregistrement');
  };

  const whenConfirmingTheEndRegularisation = (): void => {
    cy.get(dataSelector('anomalie-confirmer')).click();
  };

  const thenTheAnomalyIsProcessedFromTheReceipt = (): void => {
    cy.get(dataSelector('anomalie-resultat')).should('contain.text', 'Anomalie traitée');
    cy.get(dataSelector('anomalie-fin-automatique')).should('not.exist');
    cy.get(dataSelector('conflit-diagnostic')).should('not.exist');
    cy.get(dataSelector('anomalie-pointage')).should('have.length', 2);
    cy.get(dataSelector('anomalie-activite')).should('contain.text', 'Terminée · 9 h');
    cy.get(dataSelector('anomalie-confirmer')).should('not.exist');
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

  it('should regularise the end of an activity without workstation without naming one', () => {
    givenAnActivityWithoutWorkstationRegularisedByTheBackend();

    whenOpeningTheAutomaticEnd();
    whenChoosingTheEndRegularisation();
    whenDatingTheEnd();
    whenPreviewingTheEndRegularisation();

    thenTheRegularisationNamesNoWorkstation();
  });

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
    cy.get(dataSelector('anomalie-apercu-acte')).should('contain.text', 'Poste : Sans poste');
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

    thenTheCorrectionIsProcessedFromTheReceipt();
  });

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
    cy.get(dataSelector('anomalie-apercu')).should('contain.text', 'Terminée · 15 h');
  };

  const thenTheCorrectionIsProcessedFromTheReceipt = (): void => {
    cy.get(dataSelector('anomalie-resultat')).should('contain.text', 'Anomalie traitée');
    cy.get(dataSelector('conflit-diagnostic')).should('not.exist');
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

  refusFixture.forEach(({ statut, code, message }) => {
    it(`should keep the dated end and show the known refusal ${code} of the preview`, () => {
      givenAPreviewRefusedWith(statut, code, message);

      whenOpeningTheAutomaticEnd();
      whenChoosingTheEndRegularisation();
      whenDatingTheEnd();
      whenRequestingTheRefusedPreview();

      thenTheRefusalIsExplainedAndTheEndIsKept(message);
    });
  });

  const givenAPreviewRefusedWith = (statut: number, code: string, message: string): void => {
    cy.intercept('GET', urlDossier, { body: dossierFinAutomatiqueFixture() });
    cy.intercept('POST', urlApercu, { statusCode: statut, body: { type: `urn:glm:erreur:atelier:${code}`, message } });
  };

  const whenRequestingTheRefusedPreview = (): void => {
    cy.get(dataSelector('anomalie-previsualiser')).click();
  };

  const thenTheRefusalIsExplainedAndTheEndIsKept = (message: string): void => {
    cy.get(dataSelector('anomalie-operation')).should('contain.text', 'Acte refusé');
    cy.get(dataSelector('anomalie-refus')).should('contain.text', message);
    cy.get(dataSelector('anomalie-apercu')).should('not.exist');
    thenTheInstantFieldsShow(instantRegulariseLocalFixture);
    cy.get(dataSelector('anomalie-fin-automatique')).should('be.visible');
  };

  it('should reacquire the dossier after an obsolete confirmation and require a new preview of the same end', () => {
    givenAConfirmationWhoseConsequencesBecameObsolete();

    whenOpeningTheAutomaticEnd();
    whenChoosingTheEndRegularisation();
    whenDatingTheEnd();
    whenPreviewingTheEndRegularisation();
    whenConfirmingTheEndRegularisation();

    thenTheEndRegularisationAwaitsANewPreview();
  });

  const givenAConfirmationWhoseConsequencesBecameObsolete = (): void => {
    const lectures = [dossierFinAutomatiqueFixture(), { ...dossierFinAutomatiqueFixture(), revision: 1 }];
    cy.intercept('GET', urlDossier, request => {
      const dossier = lectures.shift();
      if (dossier === undefined) throw new Error('Lecture de dossier fixture inattendue');
      request.reply({ body: dossier });
    }).as('dossierCourant');
    cy.intercept('POST', urlApercu, request => {
      const demande = request.body as components['schemas']['RestDemandeDApercu'];
      request.reply({
        body: apercuFixture(demande, dossierFinAutomatiqueFixture(), dossierApresRegularisationFixture(), finRegulariseeFixture),
      });
    }).as('apercu');
    cy.intercept('POST', urlConfirmation, {
      statusCode: 409,
      body: { type: 'urn:glm:erreur:atelier:apercu-obsolete', message: 'Les conséquences ont changé' },
    }).as('confirmation');
  };

  const thenTheEndRegularisationAwaitsANewPreview = (): void => {
    cy.get('@dossierCourant.all').should('have.length', 2);
    cy.get(dataSelector('anomalie-operation')).should('contain.text', 'Les données ont changé');
    thenTheInstantFieldsShow(instantRegulariseLocalFixture);
    cy.get(dataSelector('anomalie-apercu')).should('not.exist');
    cy.get(dataSelector('anomalie-confirmer')).should('not.exist');
    cy.get(dataSelector('anomalie-previsualiser')).should('be.enabled');
  };

  const givenTheClockOnAFixedDay = (): void => {
    cy.clock(new Date(2026, 9, 5, 10, 0).getTime(), ['Date']);
  };
});
