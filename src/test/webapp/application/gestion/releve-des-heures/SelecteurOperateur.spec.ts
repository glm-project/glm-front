import { dataSelector } from '../../../utils/DataSelector';
import { OperateursDuReleveApiFixture } from '../../../utils/gestion/releve-des-heures/OperateursDuReleveApiFixture';
import {
  feuilleFixture,
  SyntheseDesHeuresApiFixture,
  syntheseFixture,
} from '../../../utils/gestion/releve-des-heures/SyntheseDesHeuresApiFixture';

const HORLOGE = new Date(2026, 8, 17, 10).getTime();
const ADRESSE = '/operateurs/op-1/heures?annee=2026&semaine=38&jour=2026-09-14';

const reportOfFixture = (id: string, nom: string, prenom: string, duree: string) => ({
  synthese: { ...syntheseFixture(2026, 38), operateur: { id, nom, prenom }, dureeOperationnelleTotale: { complete: true, valeur: duree } },
  feuille: { ...feuilleFixture(2026, 38), operateur: { id, nom, prenom } },
});

describe('Change the operator of the operational time consultation', () => {
  let liste: OperateursDuReleveApiFixture;
  let rapports: SyntheseDesHeuresApiFixture;
  beforeEach(() => {
    liste = new OperateursDuReleveApiFixture();
    rapports = new SyntheseDesHeuresApiFixture();
  });

  it('should consult another operator with different hours and preserve the week and open day', () => {
    givenTwoDifferentReports();
    whenVisiting(ADRESSE);
    whenSelectingAClocking();

    whenChoosingOperator('Zoé');

    thenConsultZoeWithTheSameWeekAndDay();
    thenNoClockingIsSelected();
  });

  it('should materialize the current implicit week and automatically open day when changing operator', () => {
    givenTwoDifferentReports();
    whenVisiting('/operateurs/op-1/heures');

    whenChoosingOperator('Zoé');

    thenTheAddressIs('/operateurs/op-2/heures', '?annee=2026&semaine=38&jour=2026-09-17');
    thenTheOpenDayIs('jeu. 17');
  });

  it('should preserve the automatically opened day of a past week even when the target has no clocking there', () => {
    givenTwoDifferentReports();
    whenVisiting('/operateurs/op-1/heures?annee=2026&semaine=37');

    whenChoosingOperator('Zoé');

    thenTheAddressIs('/operateurs/op-2/heures', '?annee=2026&semaine=37&jour=2026-09-07');
    thenTheOpenDayIs('lun. 7');
  });

  it('should leave the day implicit when the source past report has no open day', () => {
    givenTwoDifferentReports();
    givenAnEmptyPastSourceReport();
    whenVisiting('/operateurs/op-1/heures?annee=2026&semaine=37');

    whenChoosingOperator('Zoé');

    thenTheAddressIs('/operateurs/op-2/heures', '?annee=2026&semaine=37');
    thenTheOpenDayIs('lun. 7');
  });

  it('should retain an explicitly requested day when choosing from a failed report', () => {
    rapports.failRead = true;
    givenTwoDifferentReports();
    whenVisitingAnUnavailableAddress(ADRESSE);

    whenChoosingFromTheFailedReport();

    thenConsultZoeWithTheSameWeekAndDay();
  });

  const whenChoosingFromTheFailedReport = (): void => {
    cy.get(dataSelector('synthese-error')).then(() => {
      rapports.failRead = false;
    });
    whenChoosingOperator('Zoé');
  };

  const givenAnEmptyPastSourceReport = (): void => {
    const synthese = syntheseFixture(2026, 37);
    const feuille = feuilleFixture(2026, 37);
    rapports.seed({
      synthese: {
        ...synthese,
        jours: (synthese.jours ?? []).map(jour => ({ ...jour, pointages: [], dureeOperationnelle: { complete: true, valeur: 'PT0S' } })),
      },
      feuille: { ...feuille, jours: (feuille.jours ?? []).map(jour => ({ ...jour, activites: [] })) },
    });
    const operateur = { id: 'op-2', nom: 'Évrard', prenom: 'Zoé' };
    rapports.seed({ synthese: { ...synthese, operateur }, feuille: { ...feuille, operateur } });
  };

  it('should restore the previous operator and consultation from browser history', () => {
    givenTwoDifferentReports();
    whenVisiting(ADRESSE);
    whenChoosingOperator('Zoé');

    whenGoingBackFromZoe();

    thenTheAddressIs('/operateurs/op-1/heures', '?annee=2026&semaine=38&jour=2026-09-14');
    thenTheDisplayedReportIs('Jean DUPONT', '2 h 00');
    thenTheListWasAcquiredOnce();
  });

  it('should restore the chosen operator with forward history', () => {
    givenTwoDifferentReports();
    whenVisiting(ADRESSE);
    whenChoosingOperator('Zoé');

    whenGoingBackAndForward();

    thenConsultZoeWithTheSameWeekAndDay();
    thenTheListWasAcquiredOnce();
  });

  it('should reproduce the consultation after reloading its address and acquire the list anew', () => {
    givenTwoDifferentReports();
    whenVisiting(ADRESSE);
    whenChoosingOperator('Zoé');

    whenReloadingZoe();

    thenConsultZoeWithTheSameWeekAndDay();
    thenTheListWasAcquiredTwice();
  });

  it('should reproduce a shared consultation directly', () => {
    givenTwoDifferentReports();

    whenVisiting('/operateurs/op-2/heures?annee=2026&semaine=38&jour=2026-09-14');

    thenConsultZoeWithTheSameWeekAndDay();
  });

  it('should reuse the mounted operator list across operator, week and day changes', () => {
    givenTwoDifferentReports();
    whenVisiting(ADRESSE);
    whenChoosingOperator('Zoé');

    whenChangingWeekAndDay();

    thenTheOpenDayIs('mar. 8');
    thenTheListWasAcquiredOnce();
  });

  it('should retain the complete operator list when an invalid day is visited and corrected through history', () => {
    givenTwoDifferentReports();
    whenVisiting(ADRESSE);

    whenVisitingAnInvalidDayAndGoingBack();

    thenTheAddressIs('/operateurs/op-1/heures', '?annee=2026&semaine=38&jour=2026-09-14');
    thenTheDisplayedReportIs('Jean DUPONT', '2 h 00');
    thenTheListWasAcquiredOnce();
  });

  const whenVisitingAnInvalidDayAndGoingBack = (): void => {
    cy.window().then(win => {
      win.history.pushState({}, '', '/operateurs/op-1/heures?annee=2026&semaine=38&jour=2026-09-21');
      win.dispatchEvent(new win.PopStateEvent('popstate'));
    });
    cy.get(dataSelector('synthese-adresse-invalide')).should('be.visible');
    cy.go('back');
  };

  it('should offer operators beyond the first page', () => {
    givenMoreThanOnePageOfOperators();
    givenTwoDifferentReports();
    whenVisiting(ADRESSE);

    whenChoosingOperator('Dernière');

    thenTheAddressIs('/operateurs/op-101/heures', '?annee=2026&semaine=38&jour=2026-09-14');
    thenTheDisplayedReportIs('Dernière ZOULOU', '9 h 00');
    thenBothOperatorPagesWereAcquired();
  });

  it('should refuse an invalid address without acquiring either hours or operators', () => {
    givenTwoDifferentReports();

    whenVisitingAnUnavailableAddress('/operateurs/op-1/heures?annee=2025&semaine=53');

    thenTheAddressIsRefusedWithoutAcquisition();
  });

  it('should offer a neutral choice for an unknown operator absent from both identity sources', () => {
    rapports.operateurInconnu = true;
    givenTwoDifferentReports();

    whenVisitingAnUnavailableAddress('/operateurs/disparu/heures?annee=2026&semaine=38&jour=2026-09-14');

    thenTheUnknownConsultationOffersANeutralOperatorChoice();
  });

  it('should allow another operator to be chosen from an unknown consultation while preserving its requested day', () => {
    rapports.operateurInconnu = true;
    givenTwoDifferentReports();
    whenVisitingAnUnavailableAddress('/operateurs/disparu/heures?annee=2026&semaine=38&jour=2026-09-14');

    whenChoosingFromTheUnknownConsultation();

    thenConsultZoeWithTheSameWeekAndDay();
  });

  it('should keep the real consultation and selected clocking when browser history rejects the operator navigation', () => {
    givenTwoDifferentReports();
    whenVisitingWithUnavailableHistory();
    whenSelectingAClocking();

    whenChoosingOperator('Zoé');

    thenTheNavigationFailureKeepsTheActualConsultation();
  });

  it('should allow the operator choice to be retried after browser history recovers', () => {
    givenTwoDifferentReports();
    whenVisitingWithUnavailableHistory();
    whenChoosingOperator('Zoé');

    whenRetryingTheOperatorChoice();

    thenConsultZoeWithTheSameWeekAndDay();
  });

  it('should keep the latest requested identity and hours when an older operator response arrives last', () => {
    givenTwoDifferentReports();
    givenALateZoeReport();
    whenVisiting(ADRESSE);

    whenChoosingAliceWhileZoeLoads();

    thenTheDisplayedReportIs('Alice ÉVRARD', '7 h 00');
    thenTheListWasAcquiredOnce();
    thenTheLoadingConsultationWasIdentifiedAsZoe();
  });

  let rejectHistory = true;
  let releaseLateZoe = (): void => undefined;
  const lateZoeArrivals: number[] = [];

  const historyIsUnavailableFor = (url: string | URL | null | undefined): boolean =>
    rejectHistory && String(url).includes('/operateurs/op-2/');

  const whenVisitingWithUnavailableHistory = (): void => {
    rejectHistory = true;
    cy.viewport(1280, 900);
    cy.clock(HORLOGE, ['Date']);
    cy.visit(ADRESSE, {
      onBeforeLoad: win => {
        const push = win.history.pushState.bind(win.history);
        win.history.pushState = (data, unused, url) => {
          if (historyIsUnavailableFor(url)) {
            throw new Error('History unavailable');
          }
          push(data, unused, url);
        };
      },
    });
    cy.get(dataSelector('synthese-operationnel-total')).should('be.visible');
  };

  const thenTheNavigationFailureKeepsTheActualConsultation = (): void => {
    cy.get(dataSelector('synthese-navigation-erreur')).should('contain.text', 'Impossible de changer d’opérateur');
    thenTheAddressIs('/operateurs/op-1/heures', '?annee=2026&semaine=38&jour=2026-09-14');
    thenTheDisplayedReportIs('Jean DUPONT', '2 h 00');
    cy.get(dataSelector('synthese-journal-entree')).filter('[aria-pressed="true"]').should('have.length', 1);
  };

  const whenRetryingTheOperatorChoice = (): void => {
    cy.get(dataSelector('synthese-navigation-erreur')).then(() => {
      rejectHistory = false;
    });
    whenChoosingOperator('Zoé');
  };

  const givenALateZoeReport = (): void => {
    lateZoeArrivals.length = 0;
    rapports.seed(reportOfFixture('op-3', 'Évrard', 'Alice', 'PT7H'));
    const attente = new Promise<void>(resolve => {
      releaseLateZoe = resolve;
    });
    cy.intercept({ method: 'GET', pathname: '/api/syntheses-des-heures/op-2' }, request => {
      lateZoeArrivals.push(1);
      return attente.then(() =>
        request.reply({
          body: { ...reportOfFixture('op-2', 'Évrard', 'Zoé', 'PT5H').synthese, evaluation: String(request.query['evaluation']) },
        }),
      );
    }).as('lateZoe');
  };

  const whenChoosingAliceWhileZoeLoads = (): void => {
    whenChoosingOperator('Zoé');
    cy.get(dataSelector('synthese-loading')).should('be.visible');
    cy.get(dataSelector('selecteur-operateur')).invoke('text').as('loadingIdentity', { type: 'static' });
    cy.get(dataSelector('synthese-operationnel-total')).should('not.exist');
    cy.wrap(lateZoeArrivals).should('have.length', 1);
    whenChoosingOperator('Alice');
    cy.get(dataSelector('synthese-identite'))
      .should('contain.text', 'Alice ÉVRARD')
      .then(() => {
        releaseLateZoe();
      });
    cy.wait('@lateZoe');
  };

  const thenTheLoadingConsultationWasIdentifiedAsZoe = (): void => {
    cy.get('@loadingIdentity').should('contain', 'Zoé ÉVRARD');
  };

  const whenVisitingAnUnavailableAddress = (adresse: string): void => {
    cy.viewport(1280, 900);
    cy.clock(HORLOGE, ['Date']);
    cy.visit(adresse);
  };

  const whenChoosingFromTheUnknownConsultation = (): void => {
    cy.get(dataSelector('synthese-operateur-introuvable')).then(() => {
      rapports.operateurInconnu = false;
    });
    whenChoosingOperator('Zoé');
  };

  const thenTheUnknownConsultationOffersANeutralOperatorChoice = (): void => {
    cy.get(dataSelector('synthese-operateur-introuvable')).should('be.visible');
    cy.get(dataSelector('selecteur-operateur')).should('be.enabled').and('contain.text', 'Choisir un opérateur');
  };

  const thenTheAddressIsRefusedWithoutAcquisition = (): void => {
    cy.get(dataSelector('synthese-adresse-invalide')).should('be.visible');
    cy.wrap(liste.lectures).should('be.empty');
    cy.wrap(rapports.lectures).should('be.empty');
  };

  const givenMoreThanOnePageOfOperators = (): void => {
    liste = new OperateursDuReleveApiFixture([
      ...Array.from({ length: 100 }, (_, index) => ({
        id: `op-${String(index + 1)}`,
        nom: `Nom ${String(index)}`,
        prenom: 'Prénom',
        postes: [],
        natures: [],
      })),
      { id: 'op-101', nom: 'Zoulou', prenom: 'Dernière', postes: [], natures: [] },
    ]);
    rapports.seed(reportOfFixture('op-101', 'Zoulou', 'Dernière', 'PT9H'));
  };

  const thenBothOperatorPagesWereAcquired = (): void => {
    cy.wrap(liste.lectures).should('deep.equal', [0, 1]);
  };
  const thenTheListWasAcquiredOnce = (): void => {
    cy.wrap(liste.lectures).should('deep.equal', [0]);
  };
  const thenTheListWasAcquiredTwice = (): void => {
    cy.wrap(liste.lectures).should('deep.equal', [0, 0]);
  };

  const thenTheDisplayedReportIs = (name: string, total: string): void => {
    cy.get(dataSelector('synthese-identite')).should('contain.text', name);
    cy.get(dataSelector('synthese-operationnel-total')).should('have.text', total);
  };

  const whenGoingBackFromZoe = (): void => {
    cy.get(dataSelector('synthese-identite')).should('contain.text', 'Zoé ÉVRARD');
    cy.go('back');
  };

  const whenGoingBackAndForward = (): void => {
    whenGoingBackFromZoe();
    cy.get(dataSelector('synthese-identite')).should('contain.text', 'Jean DUPONT');
    cy.go('forward');
  };

  const whenReloadingZoe = (): void => {
    cy.get(dataSelector('synthese-identite')).should('contain.text', 'Zoé ÉVRARD');
    cy.reload();
  };

  const whenChangingWeekAndDay = (): void => {
    cy.get(dataSelector('synthese-identite')).should('contain.text', 'Zoé ÉVRARD');
    cy.get(dataSelector('synthese-semaine')).select('37');
    cy.get(dataSelector('synthese-jour-lien')).eq(1).click();
  };

  const thenTheAddressIs = (path: string, query: string): void => {
    cy.location('pathname').should('equal', path);
    cy.location('search').should('equal', query);
  };

  const thenTheOpenDayIs = (jour: string): void => {
    cy.get(dataSelector('synthese-jour-lien')).filter('[aria-current="true"]').should('contain.text', jour);
  };

  const givenTwoDifferentReports = (): void => {
    rapports.seed(reportOfFixture('op-1', 'Dupont', 'Jean', 'PT2H'));
    rapports.seed(reportOfFixture('op-2', 'Évrard', 'Zoé', 'PT5H'));
    const operateur = { id: 'op-2', nom: 'Évrard', prenom: 'Zoé' };
    const synthese = syntheseFixture(2026, 37);
    const feuille = feuilleFixture(2026, 37);
    rapports.seed({
      synthese: {
        ...synthese,
        operateur,
        dureeOperationnelleTotale: { complete: true, valeur: 'PT0S' },
        jours: (synthese.jours ?? []).map(jour => ({ ...jour, pointages: [], dureeOperationnelle: { complete: true, valeur: 'PT0S' } })),
      },
      feuille: { ...feuille, operateur, jours: (feuille.jours ?? []).map(jour => ({ ...jour, activites: [] })) },
    });
    rapports.install();
    liste.install();
  };

  const whenVisiting = (adresse: string): void => {
    cy.viewport(1280, 900);
    cy.clock(HORLOGE, ['Date']);
    cy.visit(adresse);
    cy.get(dataSelector('synthese-operationnel-total')).should('be.visible');
  };

  const whenSelectingAClocking = (): void => {
    cy.get(dataSelector('synthese-journal-entree')).first().click();
  };

  const whenChoosingOperator = (query: string): void => {
    cy.get(dataSelector('selecteur-operateur')).click();
    cy.get(dataSelector('selecteur-operateur-recherche')).type(query);
    cy.get(dataSelector('selecteur-operateur-proposition')).first().click();
  };

  const thenConsultZoeWithTheSameWeekAndDay = (): void => {
    cy.location('pathname').should('equal', '/operateurs/op-2/heures');
    cy.location('search').should('equal', '?annee=2026&semaine=38&jour=2026-09-14');
    cy.get(dataSelector('synthese-identite')).should('contain.text', 'Zoé ÉVRARD');
    cy.get(dataSelector('synthese-operationnel-total')).should('have.text', '5 h 00');
  };

  const thenNoClockingIsSelected = (): void => {
    cy.get(dataSelector('synthese-journal-entree')).filter('[aria-pressed="true"]').should('have.length', 0);
    cy.get(dataSelector('synthese-repere-selection')).should('not.exist');
  };
});
