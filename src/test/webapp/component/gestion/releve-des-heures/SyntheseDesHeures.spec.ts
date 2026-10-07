import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import {
  feuilleFixture,
  SemaineSemee,
  SyntheseDesHeuresApiFixture,
  syntheseFixture,
} from '../../../utils/gestion/releve-des-heures/SyntheseDesHeuresApiFixture';

type RestActivite = components['schemas']['RestActiviteDeLaFeuilleDeTemps'];
type RestTotal = components['schemas']['RestDureeDeSynthese'];
const HORLOGE = new Date(2026, 8, 26, 10, 30).getTime();
const ADRESSE = '/operateurs/op-1/heures?annee=2026&semaine=38&jour=2026-09-14';
const total = (valeur: string): RestTotal => ({ complete: true, valeur });
const heure = (jour: number, valeur: number): string => new Date(2026, 8, jour, valeur).toISOString();
const activite = (id: string, debut: string, fin: string, poste?: string): RestActivite => ({
  element: 'element-1',
  ...(poste === undefined ? {} : { poste }),
  categorie: 'TRAVAIL',
  debut,
  fin,
  activite: { id, debut, fin, etat: 'TERMINEE' },
});
const semaineDeJourFixture = (): SemaineSemee => {
  const synthese = syntheseFixture(2026, 38);
  const feuille = feuilleFixture(2026, 38);
  return { synthese, feuille };
};
const semaineEnParalleleFixture = (): SemaineSemee => {
  const base = semaineDeJourFixture();
  return {
    synthese: {
      ...base.synthese,
      elements: [
        {
          ...requiredFixture(base.synthese.elements[0]),
          postes: [{ poste: { id: 'poste-1', libelle: 'DMU 50' } }, { poste: { id: 'poste-2', libelle: 'Charmilles FO 350' } }],
        },
      ],
    },
    feuille: {
      ...base.feuille,
      jours: requiredFixture(base.feuille.jours).map((jour, rang) =>
        rang === 0
          ? {
              ...jour,
              activites: [activite('a', heure(14, 8), heure(14, 9), 'poste-1'), activite('b', heure(14, 8), heure(14, 9), 'poste-2')],
            }
          : jour,
      ),
    },
  };
};
const dureeDeNuit = (rang: number): string => {
  switch (rang) {
    case 0:
      return 'PT4H';
    case 1:
      return 'PT8H';
    default:
      return 'PT0S';
  }
};
const semaineDeNuitFixture = (): SemaineSemee => {
  const base = semaineDeJourFixture();
  const origine = { id: 'nuit', debut: heure(14, 20), fin: heure(15, 8), etat: 'TERMINEE' as const };
  return {
    synthese: {
      ...base.synthese,
      dureeOperationnelleTotale: total('PT12H'),
      elements: [{ ...requiredFixture(base.synthese.elements[0]), duree: total('PT12H') }],
      jours: requiredFixture(base.synthese.jours).map((jour, rang) => ({
        ...jour,
        pointages: [],
        dureeOperationnelle: total(dureeDeNuit(rang)),
      })),
    },
    feuille: {
      ...base.feuille,
      jours: requiredFixture(base.feuille.jours).map((jour, rang) => ({
        ...jour,
        activites:
          rang < 2
            ? [
                {
                  element: 'element-1',
                  categorie: 'TRAVAIL',
                  debut: heure(rang === 0 ? 14 : 15, rang === 0 ? 20 : 0),
                  fin: heure(15, rang === 0 ? 0 : 8),
                  activite: origine,
                },
              ]
            : [],
      })),
    },
  };
};
const semaineIncompleteFixture = (): SemaineSemee => {
  const base = semaineDeJourFixture();
  return {
    synthese: {
      ...base.synthese,
      dureeOperationnelleTotale: { complete: false },
      elements: [{ ...requiredFixture(base.synthese.elements[0]), duree: { complete: false }, dureeNonConformite: total('PT1H') }],
      jours: requiredFixture(base.synthese.jours).map((jour, rang) =>
        rang === 0 ? { ...jour, dureeOperationnelle: { complete: false } } : jour,
      ),
    },
    feuille: {
      ...base.feuille,
      jours: requiredFixture(base.feuille.jours).map((jour, rang) =>
        rang === 0
          ? {
              ...jour,
              activites: [
                {
                  element: 'element-1',
                  categorie: 'TRAVAIL',
                  debut: heure(14, 8),
                  activite: { id: 'a', debut: heure(14, 8), etat: 'A_RESOUDRE', finAuPlusTard: heure(14, 17) },
                },
              ],
            }
          : jour,
      ),
    },
  };
};
const semaineAFinAutomatiqueFixture = (debut: number, fin: number): SemaineSemee => {
  const base = semaineDeJourFixture();
  const duree = total(`PT${fin - debut}H`);
  return {
    synthese: {
      ...base.synthese,
      dureeOperationnelleTotale: duree,
      elements: [{ ...requiredFixture(base.synthese.elements[0]), duree }],
      jours: requiredFixture(base.synthese.jours).map((jour, rang) =>
        rang === 0
          ? {
              ...jour,
              dureeOperationnelle: duree,
              pointages: [{ id: 'a', type: 'DEBUT', intention: 'OUVERTURE', element: 'element-1', dateDeSurvenue: heure(14, debut) }],
            }
          : jour,
      ),
    },
    feuille: {
      ...base.feuille,
      jours: requiredFixture(base.feuille.jours).map((jour, rang) =>
        rang === 0
          ? {
              ...jour,
              activites: [
                {
                  element: 'element-1',
                  categorie: 'TRAVAIL',
                  debut: heure(14, debut),
                  fin: heure(14, fin),
                  activite: { id: 'a', debut: heure(14, debut), fin: heure(14, fin), etat: 'TERMINEE_AUTOMATIQUEMENT' },
                },
              ],
            }
          : jour,
      ),
    },
  };
};

const requiredFixture = <T>(value: T | undefined): T => {
  if (value === undefined) {
    throw new Error('Required scenario fixture is missing');
  }
  return value;
};

describe('Operational time report in gestion', () => {
  let api: SyntheseDesHeuresApiFixture;
  beforeEach(() => {
    api = new SyntheseDesHeuresApiFixture();
  });

  it('should show the received closed activity and operational total without presence', () => {
    givenAWeek(semaineDeJourFixture());
    whenVisiting(ADRESSE);

    thenShowTheReceivedClosedActivityAndOperationalTotalWithoutPresence();
  });

  it('should split received concurrent work into one sub-row per workstation', () => {
    givenAWeek(semaineEnParalleleFixture());
    whenVisiting(ADRESSE);

    thenSplitReceivedConcurrentWorkIntoOneSubRowPerWorkstation();
  });

  it('should keep raw markers and journal selection on the open day', () => {
    givenAWeek(semaineDeJourFixture());
    whenVisiting(ADRESSE);
    whenChoosingTheClocking(1);

    thenKeepRawMarkersAndJournalSelectionOnTheOpenDay();
  });

  it('should render received night portions and daily totals without reconstructing the activity', () => {
    givenAWeek(semaineDeNuitFixture());
    whenVisiting(ADRESSE);

    thenRenderReceivedNightPortionsAndDailyTotalsWithoutReconstructingTheActivity();
  });

  it('should show incomplete work independently of complete nonconformity', () => {
    givenAWeek(semaineIncompleteFixture());
    whenVisiting(ADRESSE);

    thenShowIncompleteWorkIndependentlyOfCompleteNonconformity();
  });

  it('should keep the work and markers inside their day column', () => {
    givenAWeek(semaineDeJourFixture());
    whenVisiting(ADRESSE);

    thenTheWorkOfTheElementStaysInsideItsDay(0, 0);
    thenTheMarkersOfTheOpenDayStayInsideItsColumn(0);
  });

  it('should hold all seven days at 1024 pixels', () => {
    givenAWeek(semaineDeJourFixture());
    whenVisitingAt(ADRESSE, 1024);

    thenTheFriseDoesNotScroll();
  });

  it('should hold a night week at 1440 pixels', () => {
    givenAWeek(semaineDeNuitFixture());
    whenVisitingAt(ADRESSE, 1440);

    thenTheFriseDoesNotScroll();
  });

  it('should let all seven days scroll below 1024 pixels', () => {
    givenAWeek(semaineDeJourFixture());
    whenVisitingAt(ADRESSE, 768);

    thenTheFriseScrollsHorizontally();
  });

  it('should keep a common width when opening a day without compressing empty days', () => {
    givenAWeek(semaineDeNuitFixture());
    whenVisiting(ADRESSE);

    thenEveryDayHasTheSameWidth();
  });

  it('should offer a retry after a read failure', () => {
    givenAFailingRead();
    whenVisiting(ADRESSE);

    thenTheFailureOffersARetry();
  });

  it('should explain an operator the referential does not know', () => {
    givenAnUnknownOperateur();
    whenVisiting(ADRESSE);

    thenTheUnknownOperateurIsExplained();
  });

  it('should keep week navigation reachable from the keyboard', () => {
    givenAWeek(semaineDeJourFixture());
    whenVisiting(ADRESSE);
    whenFocusingTheWeekSelector();

    thenTheWeekSelectorHasFocus();
  });

  it('should keep loading visible until both received reports are available', () => {
    const resume = api.suspendSynthese();
    givenAWeek(semaineDeJourFixture());
    whenVisiting(ADRESSE);
    whenTheReadingResumes(resume);

    thenKeepLoadingVisibleUntilBothReceivedReportsAreAvailable();
  });

  it('should show an origin begun on Sunday on Monday without a duration bar', () => {
    const base = semaineDeJourFixture();
    const origine = { id: 'dimanche-22', debut: heure(13, 22), etat: 'EN_COURS' as const };
    givenAWeek({
      synthese: {
        ...base.synthese,
        dureeOperationnelleTotale: total('PT0S'),
        elements: [{ ...requiredFixture(base.synthese.elements[0]), duree: total('PT0S') }],
        jours: requiredFixture(base.synthese.jours).map(jour => ({ ...jour, pointages: [], dureeOperationnelle: total('PT0S') })),
      },
      feuille: {
        ...base.feuille,
        jours: requiredFixture(base.feuille.jours).map((jour, rang) =>
          rang === 0
            ? { ...jour, activites: [{ element: 'element-1', categorie: 'TRAVAIL', debut: heure(14, 0), activite: origine }] }
            : jour,
        ),
      },
    });
    whenVisiting(ADRESSE);

    thenShowAnOriginBegunOnSundayOnMondayWithoutADurationBar();
  });

  it('should show the received automatic end and its anomaly without manufacturing a raw end', () => {
    givenAWeek(semaineAFinAutomatiqueFixture(8, 21));
    whenVisiting(ADRESSE);

    thenShowTheReceivedAutomaticEndAndItsAnomalyWithoutManufacturingARawEnd();
  });

  it('should keep the clocked start on the middle of its bar in the week', () => {
    givenAWeek(semaineAFinAutomatiqueFixture(8, 21));
    whenVisiting(ADRESSE);

    thenTheMarkerSitsOnTheMiddleOfItsBar('synthese-barre', 'synthese-marque');
  });

  it('should keep the clocked start on the middle of its bar in the day detail', () => {
    givenAWeek(semaineAFinAutomatiqueFixture(8, 21));
    whenVisiting(ADRESSE);

    thenTheMarkerSitsOnTheMiddleOfItsBar('synthese-detail-barre', 'synthese-detail-marque');
  });

  it('should write the automatic end under the end of its bar in the week', () => {
    givenAWeek(semaineAFinAutomatiqueFixture(8, 21));
    whenVisiting(ADRESSE);

    thenTheMentionEndsUnderItsBar('synthese-barre', 'synthese-etat-court');
  });

  it('should write the automatic end under the end of its bar in the day detail', () => {
    givenAWeek(semaineAFinAutomatiqueFixture(8, 21));
    whenVisiting(ADRESSE);

    thenTheMentionEndsUnderItsBar('synthese-detail-barre', 'synthese-detail-etat');
  });

  it('should cap the end of an automatically ended bar', () => {
    givenAWeek(semaineAFinAutomatiqueFixture(8, 21));
    whenVisiting(ADRESSE);

    thenTheAutomaticEndCapsItsBar('synthese-barre');
  });

  it('should keep the cap of a one-hour automatic end inside its bar', () => {
    givenAWeek(semaineAFinAutomatiqueFixture(1, 2));
    whenVisiting(ADRESSE);

    thenTheAutomaticEndCapsItsBar('synthese-barre');
  });

  it('should keep an early automatic end inside its day in the week', () => {
    givenAWeek(semaineAFinAutomatiqueFixture(1, 2));
    whenVisiting(ADRESSE);

    thenTheMentionStaysInsideItsDay();
  });

  it('should keep an early automatic end on one line inside the day detail', () => {
    givenAWeek(semaineAFinAutomatiqueFixture(1, 2));
    whenVisiting(ADRESSE);

    thenTheDetailMentionHoldsOnOneLineInsideTheDay();
  });

  const whenTheReadingResumes = (resume: () => void): void => {
    cy.get(dataSelector('synthese-loading')).then(() => {
      resume();
    });
  };

  const givenAWeek = (semaine: SemaineSemee): void => {
    api.seed(semaine);
    api.install();
  };
  const givenAFailingRead = (): void => {
    api.failRead = true;
    api.install();
  };
  const givenAnUnknownOperateur = (): void => {
    api.operateurInconnu = true;
    api.install();
  };
  const whenVisitingAt = (adresse: string, largeur: number): void => {
    cy.viewport(largeur, 900);
    cy.clock(HORLOGE, ['Date']);
    cy.visit(adresse);
    cy.document().then(document => {
      const style = document.createElement('style');
      style.textContent = '::-webkit-scrollbar { width: 15px; height: 15px; }';
      document.head.append(style);
    });
  };
  const whenVisiting = (adresse: string): void => {
    whenVisitingAt(adresse, 1280);
  };
  const whenChoosingTheClocking = (rang: number): void => {
    cy.get(dataSelector('synthese-journal-entree')).eq(rang).click();
  };
  const whenFocusingTheWeekSelector = (): void => {
    cy.get(dataSelector('synthese-semaine')).focus();
  };

  const thenEveryDayHasTheSameWidth = (): void => {
    cy.get(dataSelector('synthese-jour-cell')).should(entetes => {
      const largeurs = [...entetes].map(entete => entete.getBoundingClientRect().width);
      expect(Math.max(...largeurs) - Math.min(...largeurs)).to.be.lessThan(1);
    });
  };

  const thenTheMarksOfTheDayStayInsideIt = (rang: number): void => {
    cy.get(dataSelector('synthese-jour-cell'))
      .eq(rang)
      .should($entete => {
        const colonne = $entete[0]?.getBoundingClientRect();
        const reperes = [...$entete.find(dataSelector('synthese-repere'))].map(repere => repere.getBoundingClientRect());
        expect(reperes.length).to.be.greaterThan(0);
        expect(Math.min(...reperes.map(repere => repere.left))).to.be.at.least((colonne?.left ?? 0) - 0.5);
        expect(Math.max(...reperes.map(repere => repere.right))).to.be.at.most((colonne?.right ?? 0) + 0.5);
      });
  };

  const thenTheWorkOfTheElementStaysInsideItsDay = (ligne: number, jour: number): void => {
    cy.get(dataSelector('synthese-element-ligne'))
      .eq(ligne)
      .find(dataSelector('synthese-element-jour'))
      .eq(jour)
      .should($cellule => {
        const colonne = $cellule[0]?.getBoundingClientRect();
        const barres = [...$cellule.find(dataSelector('synthese-barre')).filter('[data-style="travail"]')].map(barre =>
          barre.getBoundingClientRect(),
        );
        expect(barres.length).to.be.greaterThan(0);
        expect(Math.min(...barres.map(barre => barre.left))).to.be.at.least((colonne?.left ?? 0) - 0.5);
        expect(Math.max(...barres.map(barre => barre.right))).to.be.at.most((colonne?.right ?? 0) + 0.5);
        expect(Math.min(...barres.map(barre => barre.width))).to.be.greaterThan(0);
      });
  };

  const thenTheMarkersOfTheOpenDayStayInsideItsColumn = (jour: number): void => {
    cy.get(dataSelector('synthese-jour-cell'))
      .eq(jour)
      .should($entete => {
        const colonne = $entete[0]?.getBoundingClientRect();
        const marques = [...Cypress.$(dataSelector('synthese-marque'))].map(marque => marque.getBoundingClientRect());
        expect(marques.length).to.be.greaterThan(0);
        expect(Math.min(...marques.map(marque => marque.left))).to.be.at.least((colonne?.left ?? 0) - 0.5);
        expect(Math.max(...marques.map(marque => marque.right))).to.be.at.most((colonne?.right ?? 0) + 0.5);
      });
  };

  const thenTheMarkerSitsOnTheMiddleOfItsBar = (barre: string, marque: string): void => {
    cy.get(dataSelector(barre)).should($barre => {
      const milieu = (element: HTMLElement | undefined): number => {
        const rectangle = element?.getBoundingClientRect();
        return (rectangle?.top ?? 0) + (rectangle?.height ?? 0) / 2;
      };
      const marques = [...Cypress.$(dataSelector(marque))];
      expect(marques).to.have.length(1);
      expect(Math.abs(milieu(marques[0]) - milieu($barre[0]))).to.be.lessThan(1);
    });
  };

  const thenTheMentionEndsUnderItsBar = (barre: string, mention: string): void => {
    cy.get(dataSelector(barre)).should($barre => {
      const bout = $barre[0]?.getBoundingClientRect();
      const mentions = [...Cypress.$(dataSelector(mention))].map(element => element.getBoundingClientRect());
      expect(mentions).to.have.length(1);
      expect(Math.abs((mentions[0]?.right ?? 0) - (bout?.right ?? 0))).to.be.lessThan(1);
      expect(mentions[0]?.top).to.be.at.least(bout?.bottom ?? 0);
    });
  };

  const thenTheMentionStaysInsideItsDay = (): void => {
    cy.get(dataSelector('synthese-element-jour'))
      .eq(0)
      .should($cellule => {
        const colonne = $cellule[0]?.getBoundingClientRect();
        const textes = [...$cellule.find(dataSelector('synthese-etat-court'))].map(mention => {
          const texte = mention.ownerDocument.createRange();
          texte.selectNodeContents(mention);
          return texte.getBoundingClientRect();
        });
        expect(textes).to.have.length(1);
        expect(textes[0]?.width).to.be.greaterThan(0);
        expect(textes[0]?.left).to.be.at.least((colonne?.left ?? 0) - 0.5);
        expect(textes[0]?.right).to.be.at.most((colonne?.right ?? 0) + 0.5);
      });
  };

  const thenTheDetailMentionHoldsOnOneLineInsideTheDay = (): void => {
    cy.get(dataSelector('synthese-detail-etat')).should($mentions => {
      const mesures = [...$mentions].map(mention => {
        const texte = mention.ownerDocument.createRange();
        texte.selectNodeContents(mention);
        return {
          jour: mention.parentElement?.getBoundingClientRect(),
          lignes: new Set([...texte.getClientRects()].map(ligne => Math.round(ligne.top))).size,
          emprise: texte.getBoundingClientRect(),
        };
      });
      expect(mesures).to.have.length(1);
      expect(mesures[0]?.lignes).to.equal(1);
      expect(mesures[0]?.emprise.left).to.be.at.least((mesures[0]?.jour?.left ?? 0) - 0.5);
      expect(mesures[0]?.emprise.right).to.be.at.most((mesures[0]?.jour?.right ?? 0) + 0.5);
    });
  };

  const thenTheAutomaticEndCapsItsBar = (barre: string): void => {
    cy.get(dataSelector(barre)).should($barre => {
      const contour = $barre[0]?.getBoundingClientRect();
      const embouts = [...$barre.find(dataSelector('synthese-fin-automatique'))].map(embout => embout.getBoundingClientRect());
      expect(embouts).to.have.length(1);
      expect(embouts[0]?.width).to.be.greaterThan(0);
      expect(embouts[0]?.left).to.be.at.least((contour?.left ?? 0) - 0.5);
      expect(embouts[0]?.right).to.be.within((contour?.right ?? 0) - 1.5, (contour?.right ?? 0) + 0.5);
    });
  };

  const thenTheFriseDoesNotScroll = (): void => {
    cy.get(dataSelector('synthese-operationnel-total')).should('be.visible');
    cy.get('[role="region"]').should($region => {
      expect($region[0]?.scrollWidth).to.equal($region[0]?.clientWidth);
    });
  };

  const thenTheFriseScrollsHorizontally = (): void => {
    cy.get(dataSelector('synthese-operationnel-total')).should('exist');
    cy.get('[role="region"]').should($region => {
      expect($region[0]?.scrollWidth).to.be.greaterThan($region[0]?.clientWidth ?? 0);
    });
  };

  const thenTheFailureOffersARetry = (): void => {
    cy.get(dataSelector('synthese-error')).should('be.visible');
    cy.get(dataSelector('synthese-retry')).should('be.enabled');
  };

  const thenTheUnknownOperateurIsExplained = (): void => {
    cy.get(dataSelector('synthese-operateur-introuvable')).should('contain.text', 'n’existe plus au référentiel');
  };

  const thenTheWeekSelectorHasFocus = (): void => {
    cy.get(dataSelector('synthese-semaine')).should('have.focus');
  };

  const thenShowTheReceivedClosedActivityAndOperationalTotalWithoutPresence = (): void => {
    cy.get(dataSelector('synthese-barre')).should('have.length', 1);
    cy.get(dataSelector('synthese-operationnel-total')).should('have.text', '2 h 00');
    cy.get(dataSelector('synthese-presence-libelle')).should('not.exist');
  };

  const thenSplitReceivedConcurrentWorkIntoOneSubRowPerWorkstation = (): void => {
    cy.get(dataSelector('synthese-sous-ligne-poste')).should($postes => {
      expect([...$postes].map(poste => poste.textContent.trim())).to.deep.equal(['DMU 50', 'Charmilles FO 350', 'Sans poste']);
    });
    cy.get(dataSelector('synthese-sous-ligne')).should($lignes => {
      expect([...$lignes].map(ligne => ligne.querySelectorAll(dataSelector('synthese-barre')).length)).to.deep.equal([1, 1, 0]);
      expect([...$lignes].map(ligne => ligne.querySelectorAll(dataSelector('synthese-marque')).length)).to.deep.equal([0, 0, 2]);
    });
    cy.get(dataSelector('synthese-operationnel-total')).should('have.text', '2 h 00');
  };

  const thenKeepRawMarkersAndJournalSelectionOnTheOpenDay = (): void => {
    cy.get(dataSelector('synthese-journal-entree')).should('have.length', 2);
    cy.get(dataSelector('synthese-journal-entree')).filter('[aria-pressed="true"]').should('have.length', 1);
    cy.get(dataSelector('synthese-repere-selection')).should('have.length', 1);
    cy.get(dataSelector('synthese-marque')).should('have.length', 2);
  };

  const thenRenderReceivedNightPortionsAndDailyTotalsWithoutReconstructingTheActivity = (): void => {
    cy.get(dataSelector('synthese-operationnel-jour')).eq(0).should('have.text', '4 h 00');
    cy.get(dataSelector('synthese-operationnel-jour')).eq(1).should('have.text', '8 h 00');
    thenTheMarksOfTheDayStayInsideIt(0);
    thenTheWorkOfTheElementStaysInsideItsDay(0, 0);
  };

  const thenShowIncompleteWorkIndependentlyOfCompleteNonconformity = (): void => {
    cy.get(dataSelector('synthese-operationnel-total')).should('have.text', 'Incomplet');
    cy.get(dataSelector('synthese-element-total')).should('contain.text', 'Incomplet');
    cy.get(dataSelector('synthese-element-nc')).should('have.text', 'NC 1 h 00');
    cy.get(dataSelector('synthese-activite-etat')).should('contain.text', 'À résoudre');
  };

  const thenKeepLoadingVisibleUntilBothReceivedReportsAreAvailable = (): void => {
    cy.get(dataSelector('synthese-operationnel-total')).should('have.text', '2 h 00');
  };

  const thenShowAnOriginBegunOnSundayOnMondayWithoutADurationBar = (): void => {
    cy.get(dataSelector('synthese-activite-etat')).should('have.text', 'En cours depuis dimanche 13 à 22:00');
    cy.get(dataSelector('synthese-barre'))
      .should('have.attr', 'data-style', 'en-cours')
      .and('have.attr', 'style')
      .and('not.contain', 'width');
    cy.get(dataSelector('synthese-operationnel-jour')).eq(0).should('have.text', '0 h 00');
  };

  const thenShowTheReceivedAutomaticEndAndItsAnomalyWithoutManufacturingARawEnd = (): void => {
    cy.get(dataSelector('synthese-activite-etat')).should('have.text', 'Fin automatique à 21:00 · Anomalie');
    cy.get(dataSelector('synthese-operationnel-total')).should('have.text', '13 h 00');
    cy.get(dataSelector('synthese-marque')).should('have.length', 1).and('have.attr', 'data-type', 'debut');
  };
});
