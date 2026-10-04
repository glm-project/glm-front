import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';

const suiviFixture = '70000000-0000-0000-0000-000000000001';
const finFixture = '70000000-0000-0000-0000-000000000002';
const operateurFixture = '70000000-0000-0000-0000-000000000003';
const elementFixture = '70000000-0000-0000-0000-000000000004';
const debutFixture = '70000000-0000-0000-0000-000000000005';
const ncFixture = '70000000-0000-0000-0000-000000000006';
const remplacementFixture = '70000000-0000-0000-0000-000000000007';
const instantCorrigeFixture = '2026-09-14T17:01:00.123456789+02:00';
const motifFixture = 'Heure et cible vérifiées avec l’opérateur';
const correctionFixture: components['schemas']['RestActeCorrection'] = {
  kind: 'CORRECTION',
  pointage: finFixture,
  motif: motifFixture,
  fait: { type: 'FIN', intention: 'FIN', activiteVisee: ncFixture, operateur: operateurFixture, instant: instantCorrigeFixture },
};
const ligneFixture: components['schemas']['RestConflitEnListe'] = {
  adresse: { suivi: suiviFixture, pointage: finFixture },
  revision: 3,
  elementId: elementFixture,
  designation: 'M-042 réel',
  operateurId: operateurFixture,
  datePremierPointage: '2026-09-14T08:00:00.123456789+02:00',
  nombrePointages: 3,
};

const journalFixture: components['schemas']['RestEvenementDAtelier'][] = [
  {
    id: debutFixture,
    type: 'DEBUT',
    intention: 'OUVERTURE',
    activite: debutFixture,
    dateDeSurvenue: '2026-09-14T08:00:00.123456789+02:00',
    operateurId: operateurFixture,
    auteur: 'camille',
    dateDEnregistrement: '2026-09-15T08:00:00Z',
    estUneRegularisation: false,
  },
  {
    id: ncFixture,
    type: 'NON_CONFORMITE',
    intention: 'TRANSITION',
    activite: ncFixture,
    cible: debutFixture,
    dateDeSurvenue: '2026-09-14T12:00:00.123456789+02:00',
    operateurId: operateurFixture,
    auteur: 'camille',
    dateDEnregistrement: '2026-09-15T08:01:00Z',
    estUneRegularisation: false,
  },
  {
    id: finFixture,
    type: 'FIN',
    intention: 'FIN',
    cible: debutFixture,
    dateDeSurvenue: '2026-09-14T17:00:00.123456789+02:00',
    operateurId: operateurFixture,
    auteur: 'camille',
    dateDEnregistrement: '2026-09-15T08:02:00Z',
    estUneRegularisation: false,
  },
];

const perimetreFixture = (corrige: boolean): components['schemas']['RestSequenceDuDossier'] => ({
  operateurId: operateurFixture,
  datePremierPointage: ligneFixture.datePremierPointage,
  activites: [debutFixture, ncFixture],
  pointages: [debutFixture, ncFixture, finFixture, ...(corrige ? [remplacementFixture] : [])],
  nombrePointages: corrige ? 4 : 3,
});

const journalCorrigeFixture = (): components['schemas']['RestEvenementDAtelier'][] => [
  ...journalFixture.map(fait =>
    fait.id === finFixture ? { ...fait, annulation: { motif: motifFixture, auteur: 'gestionnaire', date: '2026-10-04T10:00:00Z' } } : fait,
  ),
  {
    id: remplacementFixture,
    type: 'FIN',
    intention: 'FIN',
    cible: ncFixture,
    dateDeSurvenue: instantCorrigeFixture,
    operateurId: operateurFixture,
    auteur: 'gestionnaire',
    dateDEnregistrement: '2026-10-04T10:00:00Z',
    estUneRegularisation: true,
    remplace: finFixture,
  },
];

const activitesFixture = (corrige: boolean): components['schemas']['RestActiviteDuDossier'][] => [
  {
    activite: debutFixture,
    evenement: debutFixture,
    operateurId: operateurFixture,
    categorie: 'TRAVAIL',
    debut: '2026-09-14T08:00:00.123456789+02:00',
    etat: corrige ? 'TERMINEE' : 'A_RESOUDRE',
    ...(corrige ? { fin: '2026-09-14T12:00:00.123456789+02:00', duree: 'PT4H' } : {}),
  },
  {
    activite: ncFixture,
    evenement: ncFixture,
    operateurId: operateurFixture,
    categorie: 'NON_CONFORMITE',
    debut: '2026-09-14T12:00:00.123456789+02:00',
    etat: corrige ? 'TERMINEE' : 'A_RESOUDRE',
    ...(corrige ? { fin: instantCorrigeFixture, duree: 'PT5H1M' } : {}),
  },
];

const dossierFixture = (corrige = false): components['schemas']['RestDossierConflit'] => {
  const perimetre = perimetreFixture(corrige);
  return {
    kind: corrige ? 'ANCRE_ANNULEE' : 'EN_CONFLIT',
    enConflit: !corrige,
    adresse: ligneFixture.adresse,
    revision: corrige ? 4 : 3,
    evaluation: '2026-10-04T10:00:00Z',
    perimetre,
    ...(corrige ? {} : { sequence: perimetre }),
    suivi: {
      id: suiviFixture,
      element: elementFixture,
      nom: ligneFixture.designation,
      type: 'PRODUIT',
      engageLe: '2026-09-14T06:00:00Z',
      engagePar: 'gestionnaire',
      etat: 'EN_ATTENTE',
      activitesEnCours: [],
      conflits: [],
      journal: corrige ? journalCorrigeFixture() : journalFixture,
    },
    activites: activitesFixture(corrige),
    diagnostics: corrige
      ? []
      : [
          {
            pointage: finFixture,
            raison: 'CIBLE_REMPLACEE',
            cible: { activite: debutFixture, ouvrant: debutFixture, termineePar: ncFixture },
          },
        ],
    choix: corrige
      ? []
      : [
          {
            code: 'RATTACHER_FIN_A_ACTIVITE_REMPLACANTE',
            kind: 'CORRECTION',
            pointage: finFixture,
            fait: { ...correctionFixture.fait, instant: '2026-09-14T17:00:00.123456789+02:00' },
          },
        ],
    continuations: [],
  };
};

const confirmationFixture = (commande: string): components['schemas']['RestConfirmationEnregistree'] => ({
  kind: 'ENREGISTREE',
  recu: {
    commande,
    adresse: ligneFixture.adresse,
    acte: correctionFixture,
    revisionDeDepart: 3,
    revisionEnregistree: 4,
    enregistreLe: '2026-10-04T10:00:00Z',
    evenementCree: remplacementFixture,
    evenementsTouches: [finFixture, remplacementFixture],
  },
  dossier: dossierFixture(true),
});

describe('HTTP conflict resolution in Gestion', () => {
  it('should locate the corrected terminating fact from its diagnostic while retaining the original activity identity', () => {
    givenAConflictWhoseTerminationWasCorrected();

    whenOpeningTheRealDossier();
    whenFollowingTheCorrectedTermination();

    thenTheCorrectedTerminatingFactIsReachable();
  });

  it('should reopen the same received fact after its trace was manually closed', () => {
    givenAConflictWhoseTerminationWasCorrected();

    whenOpeningTheRealDossier();
    whenFollowingTheCorrectedTermination();
    whenClosingTheCorrectedFactTrace();
    whenFollowingTheCorrectedTermination();

    thenTheCorrectedTerminatingFactIsReachable();
  });

  const givenAConflictWhoseTerminationWasCorrected = (): void => {
    const dossier = dossierFixture();
    const correctedTermination: components['schemas']['RestEvenementDAtelier'] = {
      id: remplacementFixture,
      type: 'NON_CONFORMITE',
      intention: 'TRANSITION',
      activite: ncFixture,
      cible: debutFixture,
      dateDeSurvenue: '2026-09-14T12:01:00.123456789+02:00',
      operateurId: operateurFixture,
      auteur: 'gestionnaire',
      dateDEnregistrement: '2026-10-04T10:00:00Z',
      estUneRegularisation: true,
      remplace: ncFixture,
    };
    cy.intercept('GET', `/api/atelier/suivis/${suiviFixture}/conflits/${finFixture}`, {
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
      } satisfies components['schemas']['RestDossierConflit'],
    });
  };

  const whenFollowingTheCorrectedTermination = (): void => {
    cy.get(dataSelector('conflit-diagnostic-terminaison')).click();
  };

  const whenClosingTheCorrectedFactTrace = (): void => {
    cy.get(dataSelector('conflit-pointage'))
      .filter((_index, fact) => fact.id === `pointage-${remplacementFixture}`)
      .find(dataSelector('conflit-pointage-detail'))
      .find('summary')
      .click();
  };

  const thenTheCorrectedTerminatingFactIsReachable = (): void => {
    cy.location('pathname').should('equal', `/conflits/${suiviFixture}`);
    cy.location('search').should('equal', `?pointage=${finFixture}`);
    cy.location('hash').should('equal', `#pointage-${remplacementFixture}`);
    cy.get(dataSelector('conflit-diagnostic-terminaison'))
      .should('contain.text', '2026-09-14T12:01:00.123456789+02:00')
      .and('contain.text', 'Non-conformité · Transition');
    cy.get(dataSelector('conflit-diagnostic-pointage')).should('contain.text', 'Fin · Fin ciblée');
    cy.get(dataSelector('conflit-diagnostic-ouvrant')).should('contain.text', 'Travail · Ouverture');
    cy.get(dataSelector('conflit-pointage'))
      .filter((_index, fact) => fact.id === `pointage-${remplacementFixture}`)
      .should('have.length', 1)
      .and('be.visible')
      .within(() => {
        cy.get(dataSelector('conflit-pointage-detail'))
          .should('have.prop', 'open', true)
          .contains('p', `Crée l’activité ${ncFixture}`)
          .should('be.visible');
        cy.contains('p', `Remplace le pointage ${ncFixture}`).should('be.visible');
      });
  };

  it('should load the authoritative conflict list through the production HTTP composition', () => {
    givenACompleteConflictList();

    whenVisitingRealConflicts();

    thenTheRealConflictListIsVisible();
  });

  it('should retain the dossier route and anchor while following the named activity opening', () => {
    givenRealResolutionReplies();

    whenOpeningTheRealDossier();
    whenFollowingTheReceivedActivityOpening();

    thenTheOpeningRemainsWithinTheCurrentDossier();
  });

  const whenFollowingTheReceivedActivityOpening = (): void => {
    cy.get(dataSelector('conflit-pointage'))
      .filter((_index, fact) => fact.id === `pointage-${finFixture}`)
      .contains('a', 'Travail · 2026-09-14T08:00:00.123456789+02:00')
      .click();
  };

  const thenTheOpeningRemainsWithinTheCurrentDossier = (): void => {
    cy.location('pathname').should('equal', `/conflits/${suiviFixture}`);
    cy.location('search').should('equal', `?pointage=${finFixture}`);
    cy.location('hash').should('equal', `#pointage-${debutFixture}`);
    cy.get(dataSelector('conflit-pointage'))
      .filter((_index, fact) => fact.id === `pointage-${debutFixture}`)
      .should('be.visible');
  };

  it('should preserve a precise arbitrary correction through preview and confirmation and refresh the authoritative list', () => {
    givenRealResolutionReplies();

    whenOpeningTheRealDossier();
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
    cy.get(dataSelector('conflit-confirmer')).click();
    cy.get(dataSelector('conflit-operation')).should('contain.text', 'L’issue de l’écriture est inconnue');
    cy.wait('@repriseConfirmation').its('request.body').as('commandeInitiale', { type: 'static' });
  };

  const whenCheckingTheMissingReceipt = (): void => {
    cy.get(dataSelector('conflit-verifier')).click();
    cy.wait('@verificationReelle');
    cy.get(dataSelector('conflit-choix')).should('be.disabled');
    cy.get(dataSelector('conflit-motif')).should('have.value', motifFixture);
    cy.get(dataSelector('conflit-previsualiser')).should('be.disabled');
  };

  const whenResumingTheSameConfirmation = (): void => {
    cy.get(dataSelector('conflit-reprendre-confirmation')).click();
  };

  const thenTheSameCommandHasProducedTheCanonicalResult = (): void => {
    cy.get('@commandeInitiale').then(initiale => {
      cy.wait('@repriseConfirmation').its('request.body').should('deep.equal', initiale);
    });
    cy.get('@apercuReel.all').should('have.length', 1);
    cy.get(dataSelector('conflit-resultat')).should('contain.text', 'Conflit résolu');
    cy.get(dataSelector('conflit-pointage')).should('have.length', 4);
    cy.get(dataSelector('conflit-reprendre-confirmation')).should('not.exist');
    cy.get(dataSelector('conflit-acte')).should('contain.text', 'Correction du pointage');
  };

  const givenRealResolutionReplies = (): void => {
    cy.intercept('GET', `/api/atelier/suivis/${suiviFixture}/conflits/${finFixture}`, { body: dossierFixture() });
    cy.intercept('POST', `/api/atelier/suivis/${suiviFixture}/conflits/${finFixture}/apercus`, request => {
      const body = request.body as components['schemas']['RestDemandeDApercu'];
      request.reply({
        body: {
          commande: body.commande,
          adresse: ligneFixture.adresse,
          revision: 3,
          evaluation: '2026-10-04T10:00:00Z',
          expireLe: '2026-10-04T10:05:00Z',
          reference: 'opaque-correction',
          acte: { ...correctionFixture, fait: { ...correctionFixture.fait, instant: '2026-09-14T15:01:00.123456789Z' } },
          avant: dossierFixture(),
          apres: dossierFixture(true),
        } satisfies components['schemas']['RestApercuDeResolution'],
      });
    }).as('apercuReel');
    cy.intercept('POST', `/api/atelier/suivis/${suiviFixture}/confirmations-de-resolution`, request => {
      const body = request.body as components['schemas']['RestConfirmationAEnregistrer'];
      request.reply({ body: confirmationFixture(body.commande) });
    }).as('confirmationReelle');
    cy.intercept('GET', '/api/atelier/conflits*', {
      body: { lignes: [], total: 0, complete: true, page: 0, size: 5 } satisfies components['schemas']['RestPageDesConflits'],
    }).as('listeApresResolution');
  };

  const whenOpeningTheRealDossier = (): void => {
    cy.visit(`/conflits/${suiviFixture}?pointage=${finFixture}`, {
      onBeforeLoad: window => {
        Object.assign(window, { gestionConflitsSource: 'HTTP' });
      },
    });
  };

  const whenPreparingTheArbitraryCorrection = (): void => {
    cy.get(dataSelector('conflit-choix')).first().click();
    cy.get(dataSelector('conflit-motif')).type(motifFixture);
    cy.get(dataSelector('conflit-champs-detail')).click();
    cy.get(dataSelector('conflit-instant')).clear();
    cy.get(dataSelector('conflit-instant')).type(instantCorrigeFixture);
    cy.get(dataSelector('conflit-previsualiser')).click();
    cy.get(dataSelector('conflit-apercu')).should('contain.text', '4 h').and('contain.text', '5 h 1 min');
  };

  const whenConfirmingTheRealPreview = (): void => {
    cy.get(dataSelector('conflit-confirmer')).click();
    cy.get(dataSelector('conflit-resultat')).should('contain.text', 'Conflit résolu');
    cy.get(dataSelector('conflit-pointage')).invoke('text').as('journalCanonique', { type: 'static' });
    cy.get(dataSelector('conflit-activite')).invoke('text').as('dureesCanoniques', { type: 'static' });
  };

  const whenReturningToTheRealList = (): void => {
    cy.get(dataSelector('conflit-retour')).click();
  };

  const thenTheExactActeAndCanonicalResultArePreserved = (): void => {
    cy.wait('@apercuReel').its('request.body.acte').should('deep.equal', correctionFixture);
    cy.wait('@confirmationReelle').its('request.body.reference').should('equal', 'opaque-correction');
    cy.get('@journalCanonique')
      .should('contain', instantCorrigeFixture)
      .and('contain', 'Pointage annulé')
      .and('contain', 'Remplace le pointage');
    cy.get('@dureesCanoniques').should('contain', '4 h').and('contain', '5 h 1 min');
    cy.wait('@listeApresResolution');
    cy.get(dataSelector('conflits-vide')).should('contain.text', 'Aucun conflit');
    cy.get(dataSelector('conflits-demo')).should('not.exist');
  };

  const givenACompleteConflictList = (): void => {
    cy.intercept('GET', '/api/atelier/conflits*', {
      body: { lignes: [ligneFixture], total: 1, complete: true, page: 0, size: 5 } satisfies components['schemas']['RestPageDesConflits'],
    }).as('conflitsReels');
  };

  const whenVisitingRealConflicts = (): void => {
    cy.visit('/conflits', {
      onBeforeLoad: window => {
        Object.assign(window, { gestionConflitsSource: 'HTTP' });
      },
    });
  };

  const thenTheRealConflictListIsVisible = (): void => {
    cy.wait('@conflitsReels');
    cy.get(dataSelector('conflits-demo')).should('not.exist');
    cy.get(dataSelector('conflit-ligne')).should('have.length', 1).and('contain.text', 'M-042 réel');
    cy.get(dataSelector('conflit-ligne')).should('contain.text', 'Opérateur non résolu').and('contain.text', operateurFixture);
  };
});
