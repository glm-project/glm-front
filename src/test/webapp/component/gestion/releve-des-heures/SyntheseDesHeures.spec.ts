import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import { interceptForever } from '../../../utils/Interceptor';
import {
  SemaineSemee,
  SyntheseDesHeuresApiFixture,
  syntheseFixture,
} from '../../../utils/gestion/releve-des-heures/SyntheseDesHeuresApiFixture';

type RestPointage = components['schemas']['RestPointageDeSyntheseDesHeures'];
type RestElement = components['schemas']['RestElementDeLaSynthese'];
type RestActivite = components['schemas']['RestActiviteDeLaFeuilleDeTemps'];
type TypeDePointage = RestPointage['type'];
type Heure = readonly [number, number];

const HORLOGE = new Date(2026, 8, 26, 10, 30).getTime();
const SEMAINE_DE_JOUR = '/operateurs/op-1/heures?annee=2026&semaine=39';
const SEMAINE_DE_NUIT = '/operateurs/op-1/heures?annee=2026&semaine=38';

interface JourDeMaquette {
  readonly activites?: readonly RestActivite[];
  readonly operationnelle?: string;
  readonly operationnellePresumee?: string;
  readonly pointages?: readonly (readonly [TypeDePointage, Heure, string?, string?])[];
  readonly plages?: readonly (readonly [Heure, Heure | undefined, boolean?])[];
}

interface SemaineDeMaquette {
  readonly semaine: number;
  readonly lundi: number;
  readonly presenceTotale: string;
  readonly presencePresumee: string;
  readonly operationnelleTotale: string;
  readonly operationnellePresumeeTotale: string;
  readonly elements?: readonly RestElement[];
  readonly jours: readonly JourDeMaquette[];
}

const instantFixture = (lundi: number, rang: number, [heure, minute]: Heure): string =>
  new Date(2026, 8, lundi + rang, heure, minute).toISOString();

const dateFixture = (lundi: number, rang: number): string => new Date(Date.UTC(2026, 8, lundi + rang)).toISOString().slice(0, 10);

const semaineFixture = (maquette: SemaineDeMaquette): SemaineSemee => ({
  synthese: {
    annee: 2026,
    semaine: maquette.semaine,
    dureeTotale: maquette.presenceTotale,
    dureePresumeeTotale: maquette.presencePresumee,
    dureeOperationnelleTotale: maquette.operationnelleTotale,
    dureeOperationnellePresumeeTotale: maquette.operationnellePresumeeTotale,
    elements: [...(maquette.elements ?? [])],
    operateur: { id: 'op-1', nom: 'Auve', prenom: 'Jean-Yves' },
    jours: maquette.jours.map((jour, rang) => ({
      jour: dateFixture(maquette.lundi, rang),
      dureeOperationnelle: jour.operationnelle ?? 'PT0S',
      dureeOperationnellePresumee: jour.operationnellePresumee ?? 'PT0S',
      pointages: (jour.pointages ?? []).map(([type, heure, element, poste]) => ({
        type,
        dateDeSurvenue: instantFixture(maquette.lundi, rang, heure),
        ...(element === undefined ? {} : { element }),
        ...(poste === undefined ? {} : { poste }),
      })),
    })),
  },
  feuille: {
    annee: 2026,
    semaine: maquette.semaine,
    operateur: { id: 'op-1', nom: 'Auve', prenom: 'Jean-Yves' },
    jours: maquette.jours.map((jour, rang) => ({
      jour: dateFixture(maquette.lundi, rang),
      presence: (jour.plages ?? []).map(([debut, fin, presumee]) => ({
        debut: instantFixture(maquette.lundi, rang, debut),
        ...(fin === undefined ? {} : { fin: instantFixture(maquette.lundi, rang, fin) }),
        presumee: presumee ?? false,
      })),
      activites: [...(jour.activites ?? [])],
    })),
  },
});

const elementsDeJourFixture: readonly RestElement[] = [
  {
    id: 'element-1',
    type: 'PRODUIT',
    nom: 'PRD-2026-000015',
    reference: '1015',
    description: 'Carter de pompe',
    duree: 'PT15H30M',
    dureeNonConformite: 'PT50M',
    dureePresumee: 'PT0S',
    postes: [{ poste: { id: 'poste-1', libelle: 'DMU 50' }, nature: 'Fraisage' }],
  },
  {
    id: 'element-2',
    type: 'ORDRE_DE_FABRICATION',
    nom: 'OF-2026-000057',
    description: 'Reprise d’empreinte sur un moule dont le libellé est bien trop long pour tenir dans sa colonne',
    duree: 'PT3H10M',
    dureeNonConformite: 'PT0S',
    dureePresumee: 'PT0S',
    postes: [{ poste: { id: 'poste-2', libelle: 'Mazak QT-200' }, nature: 'Tournage' }],
  },
  {
    id: 'element-3',
    type: 'PRODUIT',
    nom: 'PRD-2026-000031',
    reference: '1031',
    description: 'Couvercle de boîtier',
    duree: 'PT6H',
    dureeNonConformite: 'PT0S',
    dureePresumee: 'PT0S',
    postes: [
      { poste: { id: 'poste-1', libelle: 'DMU 50' }, nature: 'Fraisage' },
      { poste: { id: 'poste-3', libelle: 'Charmilles FO 350' }, nature: 'Érosion' },
    ],
  },
];

const activitesDuLundiFixture = (): readonly RestActivite[] => {
  const instant = (heure: Heure): string => instantFixture(21, 0, heure);
  return [
    {
      element: 'element-1',
      poste: 'poste-1',
      nature: 'Fraisage',
      categorie: 'TRAVAIL',
      debut: instant([7, 5]),
      fin: instant([12, 0]),
      presumee: false,
    },
    {
      element: 'element-1',
      poste: 'poste-1',
      nature: 'Fraisage',
      categorie: 'TRAVAIL',
      debut: instant([12, 45]),
      fin: instant([14, 30]),
      presumee: false,
    },
    {
      element: 'element-1',
      poste: 'poste-1',
      nature: 'Fraisage',
      categorie: 'NON_CONFORMITE',
      debut: instant([14, 30]),
      fin: instant([15, 20]),
      presumee: false,
    },
    {
      element: 'element-2',
      poste: 'poste-2',
      nature: 'Tournage',
      categorie: 'TRAVAIL',
      debut: instant([8, 20]),
      fin: instant([11, 30]),
      presumee: false,
    },
  ];
};

const activitesDuJeudiFixture = (): readonly RestActivite[] => {
  const instant = (heure: Heure): string => instantFixture(21, 3, heure);
  return [
    {
      element: 'element-3',
      poste: 'poste-1',
      nature: 'Fraisage',
      categorie: 'TRAVAIL',
      debut: instant([8, 0]),
      fin: instant([12, 0]),
      presumee: false,
    },
    {
      element: 'element-3',
      poste: 'poste-3',
      nature: 'Érosion',
      categorie: 'TRAVAIL',
      debut: instant([10, 0]),
      fin: instant([14, 0]),
      presumee: false,
    },
  ];
};

const samediEnCoursFixture: JourDeMaquette = {
  operationnelle: 'PT1H58M',
  pointages: [
    ['ARRIVEE', [8, 2]],
    ['DEPART', [10, 0]],
    ['ARRIVEE', [10, 20]],
  ],
  plages: [
    [
      [8, 2],
      [10, 0],
    ],
    [[10, 20], undefined],
  ],
};

const semaineDeJourFixture = (): SemaineSemee =>
  semaineFixture({
    semaine: 39,
    lundi: 21,
    presenceTotale: 'PT39H11M',
    presencePresumee: 'PT5H20M',
    operationnelleTotale: 'PT57H30M',
    operationnellePresumeeTotale: 'PT5H20M',
    elements: elementsDeJourFixture,
    jours: [
      {
        activites: activitesDuLundiFixture(),
        operationnelle: 'PT8H31M',
        pointages: [
          ['ARRIVEE', [7, 2]],
          ['DEBUT', [7, 5], 'element-1', 'poste-1'],
          ['DEBUT', [8, 20], 'element-2', 'poste-2'],
          ['FIN', [11, 30], 'element-2', 'poste-2'],
          ['DEPART', [12, 0]],
          ['ARRIVEE', [12, 45]],
          ['NON_CONFORMITE', [14, 30], 'element-1', 'poste-1'],
          ['FIN', [15, 20], 'element-1', 'poste-1'],
          ['DEPART', [16, 18]],
        ],
        plages: [
          [
            [7, 2],
            [12, 0],
          ],
          [
            [12, 45],
            [16, 18],
          ],
        ],
      },
      { operationnellePresumee: 'PT5H20M', pointages: [['ARRIVEE', [10, 20]]], plages: [[[10, 20], [15, 40], true]] },
      {
        operationnelle: 'PT7H50M',
        pointages: [
          ['ARRIVEE', [6, 55]],
          ['DEPART', [10, 0]],
          ['ARRIVEE', [10, 15]],
          ['DEPART', [12, 30]],
          ['ARRIVEE', [13, 10]],
          ['DEPART', [15, 40]],
        ],
        plages: [
          [
            [6, 55],
            [10, 0],
          ],
          [
            [10, 15],
            [12, 30],
          ],
          [
            [13, 10],
            [15, 40],
          ],
        ],
      },
      {
        activites: activitesDuJeudiFixture(),
        operationnelle: 'PT7H34M',
        pointages: [
          ['ARRIVEE', [6, 58]],
          ['DEPART', [11, 58]],
          ['ARRIVEE', [12, 40]],
          ['DEPART', [15, 2]],
          ['ARRIVEE', [15, 10]],
          ['DEPART', [15, 14]],
          ['ARRIVEE', [15, 20]],
          ['DEPART', [15, 26]],
        ],
        plages: [
          [
            [6, 58],
            [11, 58],
          ],
          [
            [12, 40],
            [15, 2],
          ],
          [
            [15, 10],
            [15, 14],
          ],
          [
            [15, 20],
            [15, 26],
          ],
        ],
      },
      {
        pointages: [
          ['ARRIVEE', [7, 0]],
          ['DEPART', [7, 0]],
        ],
      },
      samediEnCoursFixture,
      {},
    ],
  });

const semaineDeNuitFixture = (): SemaineSemee =>
  semaineFixture({
    semaine: 38,
    lundi: 14,
    presenceTotale: 'PT57H22M',
    presencePresumee: 'PT0S',
    operationnelleTotale: 'PT48H',
    operationnellePresumeeTotale: 'PT0S',
    jours: [
      {
        operationnelle: 'PT11H27M',
        pointages: [
          ['DEPART', [7, 5]],
          ['ARRIVEE', [18, 58]],
        ],
        plages: [
          [
            [0, 0],
            [7, 5],
          ],
          [
            [18, 58],
            [24, 0],
          ],
        ],
      },
      {
        operationnelle: 'PT11H37M',
        pointages: [
          ['DEPART', [7, 0]],
          ['ARRIVEE', [19, 1]],
        ],
        plages: [
          [
            [0, 0],
            [7, 0],
          ],
          [
            [19, 1],
            [24, 0],
          ],
        ],
      },
      {
        operationnelle: 'PT11H19M',
        pointages: [['DEPART', [7, 4]]],
        plages: [
          [
            [0, 0],
            [7, 4],
          ],
        ],
      },
      {},
      {},
      {},
      {},
    ],
  });

describe('Weekly hours report in gestion', () => {
  let api: SyntheseDesHeuresApiFixture;

  beforeEach(() => {
    api = new SyntheseDesHeuresApiFixture();
  });

  it('should draw a day of two visits as two presences', () => {
    givenAWeekOfDayShifts();
    whenVisiting(SEMAINE_DE_JOUR);

    thenThePresenceOfTheDayCounts(0, 2);
  });

  it('should give each element its row, its work and its non-conformity placed in the column of their day', () => {
    givenAWeekOfDayShifts();
    whenVisiting(SEMAINE_DE_JOUR);

    thenTheRowOfTheElementDrawsOnTheDay(0, 0, { travail: 2, nonConformite: 1 });
    thenTheRowOfTheElementDrawsOnTheDay(1, 0, { travail: 1, nonConformite: 0 });
    thenTheRowOfTheElementDrawsOnTheDay(1, 1, { travail: 0, nonConformite: 0 });
  });

  it('should split an element worked from two workstations at once into one sub-row per workstation', () => {
    givenAWeekOfDayShifts();
    whenVisiting(SEMAINE_DE_JOUR);

    thenTheSubRowsRead(['DMU 50', 'Charmilles FO 350']);
  });

  it('should open the day of the address and place the clockings of its elements and its arrivals and departures', () => {
    givenAWeekOfDayShifts();
    whenVisitingAt(`${SEMAINE_DE_JOUR}&jour=2026-09-21`, 1024);

    thenTheOpenDayShowsMarkersAndLines({ marques: 6, traits: 4 });
    thenTheFriseDoesNotScroll('synthese-des-heures-1024-jour-ouvert');
  });

  it('should list the clockings of the open day and situate the chosen one across the frise', () => {
    givenAWeekOfDayShifts();
    whenVisitingAt(`${SEMAINE_DE_JOUR}&jour=2026-09-21`, 1024);
    whenChoosingTheClocking(3);

    thenTheJournalListsAndTheGuideCrossesTheFrise({ entrees: 9, reperes: 1 });
    thenTheFriseDoesNotScroll('synthese-des-heures-1024-pointage-choisi');
  });

  it('should keep the durations and the presence of the week visible in the frise, the presumed ones apart', () => {
    givenAWeekOfDayShifts();
    whenVisiting(SEMAINE_DE_JOUR);

    thenTheTotalsRead({
      operationnel: '57 h 30',
      operationnelPresume: 'Présumé, à confirmer : 5 h 20',
      presence: '39 h 11',
      presencePresume: 'Présumé, à confirmer : 5 h 20',
    });
    thenTheOperationalTimeOfTheDayReads(1, { duree: '0 h 00', presumees: '+ 5 h 20 présumées' });
    thenThePresumedPresenceOfTheDayReads(1, 'Présence présumée 10:20 – 15:40');
    thenThePresenceInProgressOfTheDayReads(5, 'Présence depuis 10:20, en cours');
  });

  it('should open the axis of a night shift onto the whole day and carry it across midnight', () => {
    givenAWeekOfNightShifts();
    whenVisiting(SEMAINE_DE_NUIT);

    thenTheAxisOfTheDayRuns(0, '0 h', '24 h');
    thenThePresenceOfTheDayReachesTheEndOfItsDay(0);
    thenThePresenceOfTheDayStates(0, 'Présence depuis 18:58, se poursuit le lendemain');
    thenThePresenceOfTheDayStates(1, 'Présence depuis la veille jusqu’à 07:00');
  });

  it('should give the open day the widest column and an empty day the narrowest', () => {
    givenAWeekOfDayShifts();
    whenVisiting(SEMAINE_DE_JOUR);

    thenTheColumnsAreWidestForTheOpenDayAndNarrowestForAnEmptyOne(5, 6);
  });

  it('should keep the marks of the axis of a day inside its own column', () => {
    givenAWeekOfNightShifts();
    whenVisiting(SEMAINE_DE_NUIT);

    thenTheMarksOfTheDayStayInsideIt(0);
  });

  it('should keep the work of an element inside the column of its day', () => {
    givenAWeekOfDayShifts();
    whenVisiting(SEMAINE_DE_JOUR);

    thenTheWorkOfTheElementStaysInsideItsDay(0, 0);
  });

  it('should keep the markers of the open day inside its column', () => {
    givenAWeekOfDayShifts();
    whenVisitingAt(`${SEMAINE_DE_JOUR}&jour=2026-09-21`, 1280);

    thenTheMarkersOfTheOpenDayStayInsideItsColumn(0);
  });

  it('should hold the seven days without scrolling at 1024 pixels', () => {
    givenAWeekOfDayShifts();
    whenVisitingAt(SEMAINE_DE_JOUR, 1024);

    thenTheFriseDoesNotScroll('synthese-des-heures-1024');
  });

  it('should hold the seven days of a night week at 1440 pixels', () => {
    givenAWeekOfNightShifts();
    whenVisitingAt(SEMAINE_DE_NUIT, 1440);

    thenTheFriseDoesNotScroll('synthese-des-heures-nuit-1440');
  });

  it('should let the seven days scroll horizontally below 1024 pixels', () => {
    givenAWeekOfDayShifts();
    whenVisitingAt(SEMAINE_DE_JOUR, 768);

    thenTheFriseScrollsHorizontally();
  });

  it('should keep the loading status visible until the report arrives', () => {
    const pending = givenAPendingReport();
    whenVisiting(SEMAINE_DE_NUIT);

    thenTheLoadingStatusIsVisible(pending);
  });

  it('should offer a retry after a read failure', () => {
    givenAFailingRead();
    whenVisiting(SEMAINE_DE_NUIT);

    thenTheFailureOffersARetry();
  });

  it('should explain an operator the referential does not know', () => {
    givenAnUnknownOperateur();
    whenVisiting(SEMAINE_DE_NUIT);

    thenTheUnknownOperateurIsExplained();
  });

  it('should keep the week navigation reachable from the keyboard', () => {
    givenAWeekOfNightShifts();
    whenVisiting(SEMAINE_DE_NUIT);
    whenFocusingTheWeekSelector();

    thenTheWeekSelectorHasFocus();
  });

  const givenAWeekOfDayShifts = (): void => {
    api.seed(semaineDeJourFixture());
    api.install();
  };

  const givenAWeekOfNightShifts = (): void => {
    api.seed(semaineDeNuitFixture());
    api.install();
  };

  const givenAPendingReport = (): { send: () => void } => {
    api.installFeuille();
    return interceptForever(
      { method: 'GET', pathname: '/api/syntheses-des-heures/*' },
      { body: syntheseFixture(2026, 38) },
      'syntheseRead',
    );
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
    givenClassicScrollbars();
  };

  const givenClassicScrollbars = (): void => {
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

  const presenceDuJour = (rang: number): Cypress.Chainable<JQuery> => cy.get(dataSelector('synthese-presence-jour')).eq(rang);

  const thenThePresenceOfTheDayCounts = (rang: number, nombre: number): void => {
    cy.get(dataSelector('synthese-presence-jour')).eq(rang).find(dataSelector('synthese-presence')).should('have.length', nombre);
  };

  const thenTheRowOfTheElementDrawsOnTheDay = (ligne: number, jour: number, attendu: { travail: number; nonConformite: number }): void => {
    cy.get(dataSelector('synthese-element-ligne'))
      .eq(ligne)
      .find(dataSelector('synthese-element-jour'))
      .eq(jour)
      .should($cellule => {
        const barres = (style: string): number => $cellule.find(dataSelector('synthese-barre')).filter(`[data-style="${style}"]`).length;
        expect({ travail: barres('travail'), nonConformite: barres('nc') }).to.deep.equal(attendu);
      });
  };

  const thenTheSubRowsRead = (postes: string[]): void => {
    cy.get(dataSelector('synthese-sous-ligne-poste')).should($postes => {
      expect([...$postes].map(poste => poste.textContent.trim())).to.deep.equal(postes);
    });
    cy.get(dataSelector('synthese-sous-ligne-poste')).first().should('be.visible');
  };

  const thenTheOperationalTimeOfTheDayReads = (rang: number, attendu: { duree: string; presumees?: string }): void => {
    cy.get(dataSelector('synthese-operationnel-jour'))
      .eq(rang)
      .should('have.text', attendu.duree)
      .and('be.visible')
      .closest('[role="cell"]')
      .should($cellule => {
        const presumees = $cellule.find(dataSelector('synthese-operationnel-presume')).text().trim() || undefined;
        expect(presumees).to.equal(attendu.presumees);
      });
  };

  const thenThePresumedPresenceOfTheDayReads = (rang: number, enonce: string): void => {
    presenceDuJour(rang)
      .find(dataSelector('synthese-presence'))
      .filter('[data-style="presumee"]')
      .should('have.text', enonce)
      .and('be.visible');
  };

  const thenThePresenceInProgressOfTheDayReads = (rang: number, enonce: string): void => {
    presenceDuJour(rang)
      .find(dataSelector('synthese-presence'))
      .filter('[data-style="en-cours"]')
      .should('have.text', enonce)
      .and('be.visible');
  };

  const thenThePresenceOfTheDayStates = (rang: number, enonce: string): void => {
    presenceDuJour(rang).find(dataSelector('synthese-presence')).should('contain.text', enonce);
  };

  const thenThePresenceOfTheDayReachesTheEndOfItsDay = (rang: number): void => {
    presenceDuJour(rang)
      .find(dataSelector('synthese-presence'))
      .last()
      .should($barre => {
        const cellule = $barre.closest(dataSelector('synthese-presence-jour'))[0];
        expect($barre[0]?.getBoundingClientRect().right).to.be.closeTo(cellule?.getBoundingClientRect().right ?? 0, 2);
      });
  };

  const thenTheTotalsRead = (attendu: {
    operationnel: string;
    operationnelPresume: string;
    presence: string;
    presencePresume: string;
  }): void => {
    cy.get(dataSelector('synthese-operationnel-total')).should('have.text', attendu.operationnel).and('be.visible');
    cy.get(dataSelector('synthese-operationnel-total-presume')).should('have.text', attendu.operationnelPresume).and('be.visible');
    cy.get(dataSelector('synthese-presence-total')).should('have.text', attendu.presence).and('be.visible');
    cy.get(dataSelector('synthese-presence-total-presume')).should('have.text', attendu.presencePresume).and('be.visible');
  };

  const thenTheAxisOfTheDayRuns = (rang: number, premier: string, dernier: string): void => {
    cy.get(dataSelector('synthese-jour-cell'))
      .eq(rang)
      .find(dataSelector('synthese-repere'))
      .first()
      .should('have.text', premier)
      .and('be.visible');
    cy.get(dataSelector('synthese-jour-cell'))
      .eq(rang)
      .find(dataSelector('synthese-repere'))
      .last()
      .should('have.text', dernier)
      .and('be.visible');
  };

  const thenTheOpenDayShowsMarkersAndLines = (attendu: { marques: number; traits: number }): void => {
    cy.get(dataSelector('synthese-marque')).should('have.length', attendu.marques).and('be.visible');
    cy.get(dataSelector('synthese-trait-presence')).should('have.length', attendu.traits);
  };

  const thenTheJournalListsAndTheGuideCrossesTheFrise = (attendu: { entrees: number; reperes: number }): void => {
    cy.get(dataSelector('synthese-journal-entree')).should('have.length', attendu.entrees);
    cy.get(dataSelector('synthese-journal-entree')).filter('[aria-pressed="true"]').should('have.length', 1);
    cy.get(dataSelector('synthese-repere-selection')).should('have.length', attendu.reperes);
  };

  const thenTheColumnsAreWidestForTheOpenDayAndNarrowestForAnEmptyOne = (ouvert: number, vide: number): void => {
    cy.get(dataSelector('synthese-jour-cell')).should($entetes => {
      const largeurs = [...$entetes].map(entete => entete.getBoundingClientRect().width);
      const autres = largeurs.filter((_largeur, rang) => rang !== ouvert && rang !== vide);
      expect(largeurs[ouvert]).to.be.greaterThan(Math.max(...autres));
      expect(largeurs[vide]).to.be.lessThan(Math.min(...autres));
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

  const thenTheFriseDoesNotScroll = (capture: string): void => {
    cy.get(dataSelector('synthese-operationnel-total')).should('be.visible');
    cy.get('[role="region"]').should($region => {
      expect($region[0]?.scrollWidth).to.equal($region[0]?.clientWidth);
    });
    cy.screenshot(capture, { capture: 'fullPage' });
  };

  const thenTheFriseScrollsHorizontally = (): void => {
    cy.get(dataSelector('synthese-operationnel-total')).should('exist');
    cy.get('[role="region"]').should($region => {
      expect($region[0]?.scrollWidth).to.be.greaterThan($region[0]?.clientWidth ?? 0);
    });
    cy.screenshot('synthese-des-heures-768', { capture: 'fullPage' });
  };

  const thenTheLoadingStatusIsVisible = (pending: { send: () => void }): void => {
    cy.get(dataSelector('synthese-loading')).should('be.visible');
    cy.then(() => {
      pending.send();
    });
    cy.get(dataSelector('synthese-operationnel-total')).should('be.visible');
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
});
