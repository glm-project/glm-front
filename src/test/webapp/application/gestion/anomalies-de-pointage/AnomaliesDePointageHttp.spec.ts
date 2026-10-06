import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import {
  confirmationFixture,
  correctionFixture,
  debutFixture,
  dossierFixture,
  finFixture,
  givenTheElements,
  givenTheReferentiel,
  instantCorrigeLocalFixture,
  journalFixture,
  ligneFixture,
  motifFixture,
  ncFixture,
  operateurFixture,
  remplacementFixture,
  suiviFixture,
} from '../../../utils/gestion/anomalies-de-pointage/AnomaliesHttp.fixture';
import { thenTheInstantFieldsShow, whenTypingTheInstant } from '../../../utils/gestion/anomalies-de-pointage/InstantField';
import { instantLocalFixture } from '../../../utils/gestion/anomalies-de-pointage/InstantLocal.fixture';
import {
  thenActivityIsSelected,
  whenSelectingActivity,
  whenSelectingPointage,
} from '../../../utils/gestion/anomalies-de-pointage/SelectionDuPointage';

const instantCorrectionTerminaisonFixture = instantLocalFixture(new Date(2026, 8, 14, 12, 1), '123456789');

describe('HTTP conflict resolution in Gestion', () => {
  beforeEach(() => {
    givenTheClockOnAFixedDay();
    givenTheReferentiel();
    givenTheElements();
  });

  it('should abandon an unconfirmed proposal when the page is reloaded', () => {
    givenRealResolutionReplies();

    whenOpeningTheRealDossier();
    whenPreparingTheArbitraryCorrection();
    whenReloadingTheDossier();

    thenTheDossierRequiresANewDecision();
  });

  it('should follow the explicit remaining conflict after confirmation while retaining the closure', () => {
    givenRealResolutionReplies();
    givenACanonicalResultWithAnotherConflict();

    whenOpeningTheRealDossier();
    whenPreparingTheArbitraryCorrection();
    whenConfirmingThePreviewWithARemainingConflict();
    whenOpeningTheRemainingConflict();

    thenTheClosedElementShowsTheExplicitRemainingConflict();
  });

  it('should reacquire changed data after an obsolete confirmation and retain the exact proposal for an explicit new preview', () => {
    givenRealResolutionReplies();
    givenAConfirmationWhoseConsequencesBecameObsolete();

    whenOpeningTheRealDossier();
    whenPreparingTheArbitraryCorrection();
    whenSubmittingTheObsoleteConfirmation();

    thenTheCurrentDossierRequiresANewPreviewOfTheRetainedProposal();
  });

  it('should say the conflict in one sentence and keep the corrected terminating fact traceable under its original activity identity', () => {
    givenAConflictWhoseTerminationWasCorrected();

    whenOpeningTheRealDossier();
    whenSelectingPointage(remplacementFixture);

    thenTheConflictIsSaidInOneSentenceNamingTheCorrectedTermination();
    thenTheCorrectedTerminatingFactIsTraceable();
  });

  const givenAConflictWhoseTerminationWasCorrected = (): void => {
    const dossier = dossierFixture();
    const correctedTermination: components['schemas']['RestEvenementDAtelier'] = {
      id: remplacementFixture,
      type: 'NON_CONFORMITE',
      intention: 'TRANSITION',
      activite: ncFixture,
      cible: debutFixture,
      dateDeSurvenue: instantCorrectionTerminaisonFixture,
      operateurId: operateurFixture,
      auteur: 'gestionnaire',
      dateDEnregistrement: '2026-10-04T10:00:00Z',
      estUneRegularisation: true,
      remplace: ncFixture,
    };
    cy.intercept('GET', `/api/atelier/suivis/${suiviFixture}/anomalies/${finFixture}`, {
      body: {
        ...dossier,
        suivi: {
          ...dossier.suivi,
          journal: [
            ...journalFixture.map(fact =>
              fact.id === ncFixture
                ? { ...fact, annulation: { motif: 'Heure vérifiée', auteur: 'gestionnaire', date: '2026-10-04T10:00:00Z' } }
                : fact,
            ),
            correctedTermination,
          ],
        },
        diagnostics: [
          {
            pointage: finFixture,
            raison: 'CIBLE_REMPLACEE',
            cible: { activite: debutFixture, ouvrant: debutFixture, termineePar: remplacementFixture },
          },
        ],
      } satisfies components['schemas']['RestDossierAnomalie'],
    });
  };

  const thenTheConflictIsSaidInOneSentenceNamingTheCorrectedTermination = (): void => {
    cy.get(dataSelector('anomalie-probleme'))
      .should('have.length', 1)
      .and('have.text', 'L’arrêt de 17:00 vise le travail, remplacé à 12:01 par un passage en NC.');
  };

  const thenTheCorrectedTerminatingFactIsTraceable = (): void => {
    cy.get(dataSelector('anomalie-selection'))
      .should('be.visible')
      .within(() => {
        cy.get(dataSelector('anomalie-pointage-detail'))
          .contains('p', 'Crée l’activité Non-conformité · ')
          .should('be.visible')
          .and('not.contain.text', ncFixture);
        cy.contains('p', /^Remplace le pointage .+ · Passage en NC$/)
          .should('be.visible')
          .and('not.contain.text', ncFixture);
      });
  };

  it('should load the authoritative conflict list through the production HTTP composition', () => {
    givenACompleteConflictList();

    whenVisitingRealConflicts();

    thenTheRealConflictListIsVisible();
  });

  it('should draw on the frise an arrow from the end at fault to the activity it aims at, within the current dossier route', () => {
    givenRealResolutionReplies();

    whenOpeningTheRealDossier();
    whenSelectingTheReceivedActivityOpening();

    thenTheArrowReachesTheActivityWithinTheCurrentDossier();
  });

  const whenSelectingTheReceivedActivityOpening = (): void => {
    whenSelectingActivity(debutFixture);
  };

  const thenTheArrowReachesTheActivityWithinTheCurrentDossier = (): void => {
    cy.get(dataSelector('anomalie-frise-fleche'))
      .should('have.length', 1)
      .and('have.attr', 'data-pointage', finFixture)
      .and('have.attr', 'data-activite', debutFixture);
    cy.location('pathname').should('equal', `/anomalies/${suiviFixture}`);
    cy.location('search').should('equal', `?pointage=${finFixture}`);
    cy.location('hash').should('equal', '');
    thenActivityIsSelected(debutFixture);
  };

  it('should preserve a precise arbitrary correction through preview and confirmation and refresh the authoritative list', () => {
    givenRealResolutionReplies();

    whenOpeningTheRealDossierFromTheConflicts();
    whenPreparingTheArbitraryCorrection();
    whenConfirmingTheRealPreview();
    whenReturningToTheRealList();

    thenTheExactActeAndCanonicalResultArePreserved();
  });

  it('should keep a missing receipt uncertain and explicitly resume the same confirmation without another preview', () => {
    givenRealResolutionReplies();
    givenALostConfirmationAndAnUnattestedReceipt();

    whenOpeningTheRealDossier();
    whenPreparingTheArbitraryCorrection();
    whenLosingTheConfirmationReply();
    whenCheckingTheMissingReceipt();
    whenResumingTheSameConfirmation();

    thenTheSameCommandHasProducedTheCanonicalResult();
  });

  const givenALostConfirmationAndAnUnattestedReceipt = (): void => {
    let demandes = 0;
    cy.intercept('POST', `/api/atelier/suivis/${suiviFixture}/confirmations-de-resolution`, request => {
      demandes += 1;
      const body = request.body as components['schemas']['RestConfirmationAEnregistrer'];
      request.reply(
        demandes === 1
          ? { statusCode: 500, body: { type: 'urn:glm:erreur:atelier:issue-inconnue', message: 'Réponse perdue' } }
          : { body: confirmationFixture(body.commande) },
      );
    }).as('repriseConfirmation');
    cy.intercept('GET', `/api/atelier/suivis/${suiviFixture}/confirmations-de-resolution/*`, {
      body: { kind: 'NON_ATTESTEE' } satisfies components['schemas']['RestConfirmationNonAttestee'],
    }).as('verificationReelle');
  };

  const whenLosingTheConfirmationReply = (): void => {
    cy.get(dataSelector('anomalie-confirmer')).click();
    cy.get(dataSelector('anomalie-operation')).should('contain.text', 'L’issue de l’écriture est inconnue');
    cy.wait('@repriseConfirmation').its('request.body').as('commandeInitiale', { type: 'static' });
  };

  const whenCheckingTheMissingReceipt = (): void => {
    cy.get(dataSelector('anomalie-verifier')).click();
    cy.wait('@verificationReelle');
    cy.get(dataSelector('anomalie-choix')).should('be.disabled');
    cy.get(dataSelector('anomalie-motif')).should('have.value', motifFixture);
    cy.get(dataSelector('anomalie-previsualiser')).should('be.disabled');
  };

  const whenResumingTheSameConfirmation = (): void => {
    cy.get(dataSelector('anomalie-reprendre-confirmation')).click();
  };

  const thenTheSameCommandHasProducedTheCanonicalResult = (): void => {
    cy.get('@commandeInitiale').then(initiale => {
      cy.wait('@repriseConfirmation').its('request.body').should('deep.equal', initiale);
    });
    cy.get('@apercuReel.all').should('have.length', 1);
    cy.get(dataSelector('anomalie-resultat')).should('contain.text', 'Anomalie traitée');
    cy.get(dataSelector('anomalie-pointage')).should('have.length', 4);
    cy.get(dataSelector('anomalie-reprendre-confirmation')).should('not.exist');
    cy.get(dataSelector('anomalie-acte')).should('contain.text', 'Correction du pointage');
  };

  const givenAConfirmationWhoseConsequencesBecameObsolete = (): void => {
    const lectures = [dossierFixture(), { ...dossierFixture(), revision: 4 }];
    cy.intercept('GET', `/api/atelier/suivis/${suiviFixture}/anomalies/${finFixture}`, request => {
      const dossier = lectures.shift();
      if (dossier === undefined) throw new Error('Lecture de dossier fixture inattendue');
      request.reply({ body: dossier });
    }).as('dossierCourant');
    cy.intercept('POST', `/api/atelier/suivis/${suiviFixture}/confirmations-de-resolution`, {
      statusCode: 409,
      body: { type: 'urn:glm:erreur:atelier:apercu-obsolete', message: 'Les conséquences ont changé' },
    }).as('confirmationObsolete');
  };

  const whenSubmittingTheObsoleteConfirmation = (): void => {
    cy.get(dataSelector('anomalie-confirmer')).click();
  };

  const thenTheCurrentDossierRequiresANewPreviewOfTheRetainedProposal = (): void => {
    cy.get('@dossierCourant.all').should('have.length', 2);
    cy.get('@confirmationObsolete.all').should('have.length', 1);
    cy.get('@apercuReel.all').should('have.length', 1);
    cy.get(dataSelector('anomalie-operation')).should(
      'contain.text',
      'Les données ont changé. Vérifiez un nouvel aperçu avant de confirmer.',
    );
    cy.get(dataSelector('anomalie-motif')).should('have.value', motifFixture);
    thenTheInstantFieldsShow(instantCorrigeLocalFixture);
    cy.get(dataSelector('anomalie-previsualiser')).should('be.enabled');
    cy.get(dataSelector('anomalie-apercu')).should('not.exist');
    cy.get(dataSelector('anomalie-confirmer')).should('not.exist');
  };

  const givenRealResolutionReplies = (): void => {
    cy.intercept('GET', `/api/atelier/suivis/${suiviFixture}/anomalies/${finFixture}`, { body: dossierFixture() });
    cy.intercept('POST', `/api/atelier/suivis/${suiviFixture}/anomalies/${finFixture}/apercus`, request => {
      const body = request.body as components['schemas']['RestDemandeDApercu'];
      request.reply({
        body: {
          commande: body.commande,
          adresse: ligneFixture.adresse,
          revision: 3,
          evaluation: '2026-10-04T10:00:00Z',
          empreinteConsequences: 'empreinte-correction',
          evenement: remplacementFixture,
          acte: {
            ...correctionFixture,
            fait: { ...correctionFixture.fait, instant: instantLocalFixture(instantCorrigeLocalFixture) },
          },
          avant: dossierFixture(),
          apres: dossierFixture(true),
        } satisfies components['schemas']['RestApercuDeResolution'],
      });
    }).as('apercuReel');
    cy.intercept('POST', `/api/atelier/suivis/${suiviFixture}/confirmations-de-resolution`, request => {
      const body = request.body as components['schemas']['RestConfirmationAEnregistrer'];
      request.reply({ body: confirmationFixture(body.commande) });
    }).as('confirmationReelle');
    cy.intercept('GET', '/api/atelier/anomalies*', {
      body: { lignes: [], total: 0, complete: true, page: 0, size: 5 } satisfies components['schemas']['RestPageDesAnomalies'],
    }).as('listeApresResolution');
  };

  const whenOpeningTheRealDossier = (): void => {
    cy.visit(`/anomalies/${suiviFixture}?pointage=${finFixture}`);
  };

  const whenOpeningTheRealDossierFromTheConflicts = (): void => {
    cy.visit(`/anomalies/${suiviFixture}?nature=CONFLIT&pointage=${finFixture}`);
  };

  const whenReloadingTheDossier = (): void => {
    cy.reload();
  };

  const thenTheDossierRequiresANewDecision = (): void => {
    cy.get(dataSelector('anomalie-pointage')).should('have.length', 3);
    cy.get(dataSelector('anomalie-choix')).should('be.enabled');
    cy.get(dataSelector('anomalie-motif')).should('not.exist');
    cy.get(dataSelector('anomalie-apercu')).should('not.exist');
    cy.get(dataSelector('anomalie-confirmer')).should('not.exist');
    cy.get('@confirmationReelle.all').should('have.length', 0);
  };

  const givenACanonicalResultWithAnotherConflict = (): void => {
    const continuation = { ...ligneFixture, adresse: { suivi: suiviFixture, pointage: ncFixture }, revision: 4 };
    const cloture = { clotureLe: '2026-09-14T18:00:00Z', cloturePar: 'gestionnaire', etat: 'CLOTURE' as const };
    const avant = dossierFixture();
    const apres = dossierFixture(true);
    const dossierApres = {
      ...apres,
      enConflit: true,
      continuations: [continuation],
      suivi: { ...apres.suivi, ...cloture },
    };
    const dossierAvant = { ...avant, suivi: { ...avant.suivi, ...cloture } };
    cy.intercept('GET', `/api/atelier/suivis/${suiviFixture}/anomalies/${finFixture}`, { body: dossierAvant });
    cy.intercept('POST', `/api/atelier/suivis/${suiviFixture}/anomalies/${finFixture}/apercus`, request => {
      const body = request.body as components['schemas']['RestDemandeDApercu'];
      request.reply({
        body: {
          commande: body.commande,
          adresse: ligneFixture.adresse,
          revision: 3,
          evaluation: '2026-10-04T10:00:00Z',
          empreinteConsequences: 'empreinte-correction',
          evenement: remplacementFixture,
          acte: correctionFixture,
          avant: dossierAvant,
          apres: dossierApres,
        } satisfies components['schemas']['RestApercuDeResolution'],
      });
    });
    cy.intercept('POST', `/api/atelier/suivis/${suiviFixture}/confirmations-de-resolution`, request => {
      const body = request.body as components['schemas']['RestConfirmationAEnregistrer'];
      const confirmation = confirmationFixture(body.commande);
      request.reply({
        body: {
          ...confirmation,
          dossier: dossierApres,
        } satisfies components['schemas']['RestConfirmationEnregistree'],
      });
    });
    const dossier = dossierFixture();
    cy.intercept('GET', `/api/atelier/suivis/${suiviFixture}/anomalies/${ncFixture}`, {
      body: {
        ...dossier,
        adresse: continuation.adresse,
        revision: 4,
        suivi: { ...dossier.suivi, ...cloture },
      } satisfies components['schemas']['RestDossierAnomalie'],
    });
  };

  const whenConfirmingThePreviewWithARemainingConflict = (): void => {
    cy.get(dataSelector('anomalie-confirmer')).click();
    cy.get(dataSelector('anomalie-resultat')).should('contain.text', 'Acte enregistré, anomalie restante');
  };

  const whenOpeningTheRemainingConflict = (): void => {
    cy.get(dataSelector('anomalie-resultat')).invoke('text').as('resultatAvecContinuation', { type: 'static' });
    cy.get(dataSelector('conflit-continuation')).click();
  };

  const thenTheClosedElementShowsTheExplicitRemainingConflict = (): void => {
    cy.get('@resultatAvecContinuation').should('contain', 'Acte enregistré, anomalie restante');
    cy.location('pathname').should('equal', `/anomalies/${suiviFixture}`);
    cy.location('search').should('equal', `?pointage=${ncFixture}`);
    cy.get(dataSelector('anomalie-cloture')).should('contain.text', 'Clôturé');
    cy.get(dataSelector('anomalie-pointage')).should('have.length', 3);
  };

  const whenPreparingTheArbitraryCorrection = (): void => {
    cy.get(dataSelector('anomalie-choix')).first().click();
    cy.get(dataSelector('anomalie-motif')).type(motifFixture);
    cy.get(dataSelector('anomalie-champs-detail')).click();
    whenTypingTheInstant(instantCorrigeLocalFixture);
    cy.get(dataSelector('anomalie-previsualiser')).click();
    cy.get(dataSelector('anomalie-apercu')).should('contain.text', '4 h').and('contain.text', '5 h 1 min');
  };

  const whenConfirmingTheRealPreview = (): void => {
    cy.get(dataSelector('anomalie-confirmer')).click();
    cy.get(dataSelector('anomalie-resultat')).should('contain.text', 'Anomalie traitée');
    cy.get(dataSelector('anomalie-pointage'))
      .then(markers =>
        markers
          .toArray()
          .map(marker => marker.getAttribute('aria-label'))
          .join(' | '),
      )
      .as('journalCanonique', { type: 'static' });
    whenSelectingPointage(remplacementFixture);
    cy.get(dataSelector('anomalie-selection')).invoke('text').as('remplacantCanonique', { type: 'static' });
    cy.get(dataSelector('anomalie-activite')).eq(0).click();
    cy.get(dataSelector('anomalie-selection')).invoke('text').as('dureeDuTravail', { type: 'static' });
    cy.get(dataSelector('anomalie-activite')).eq(1).click();
    cy.get(dataSelector('anomalie-selection')).invoke('text').as('dureeDeLaNonConformite', { type: 'static' });
  };

  const whenReturningToTheRealList = (): void => {
    cy.get(dataSelector('anomalie-retour')).click();
  };

  const thenTheExactActeAndCanonicalResultArePreserved = (): void => {
    cy.wait('@apercuReel').its('request.body.acte').should('deep.equal', correctionFixture);
    cy.wait('@confirmationReelle').its('request.body').should('deep.include', {
      adresse: ligneFixture.adresse,
      revision: 3,
      acte: correctionFixture,
      empreinteConsequences: 'empreinte-correction',
      evenement: remplacementFixture,
    });
    cy.get('@journalCanonique').should('contain', '17:01:00 · Arrêt · régularisé').and('contain', 'annulé');
    cy.get('@remplacantCanonique')
      .should('contain', 'Remplace le pointage lundi 14 septembre à 17:00:00 · Arrêt')
      .and('not.contain', `Remplace le pointage ${finFixture}`);
    cy.get('@dureeDuTravail').should('contain', '4 h');
    cy.get('@dureeDeLaNonConformite').should('contain', '5 h 1 min');
    cy.wait('@listeApresResolution');
    cy.get(dataSelector('anomalies-vide')).should('contain.text', 'Aucun conflit');
    cy.get(dataSelector('anomalies-demo')).should('not.exist');
  };

  const givenACompleteConflictList = (): void => {
    cy.intercept('GET', '/api/atelier/anomalies*', {
      body: { lignes: [ligneFixture], total: 1, complete: true, page: 0, size: 5 } satisfies components['schemas']['RestPageDesAnomalies'],
    }).as('conflitsReels');
  };

  const whenVisitingRealConflicts = (): void => {
    cy.visit('/anomalies?nature=CONFLIT');
  };

  const thenTheRealConflictListIsVisible = (): void => {
    cy.wait('@conflitsReels');
    cy.get(dataSelector('anomalies-demo')).should('not.exist');
    cy.get(dataSelector('conflit-ligne')).should('have.length', 1).and('contain.text', 'M-042 réel');
    cy.get(dataSelector('conflit-ligne')).should('contain.text', 'Opérateur non résolu').and('not.contain.text', operateurFixture);
  };

  const givenTheClockOnAFixedDay = (): void => {
    cy.clock(new Date(2026, 9, 5, 10, 0).getTime(), ['Date']);
  };
});
