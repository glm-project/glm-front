import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import { interceptForever } from '../../../utils/Interceptor';
import {
  SemaineSemee,
  SyntheseDesHeuresApiFixture,
  syntheseFixture,
} from '../../../utils/gestion/releve-des-heures/SyntheseDesHeuresApiFixture';

type RestPointage = components['schemas']['RestPointageDeSyntheseDesHeures'];
type TypeDePointage = RestPointage['type'] | 'PAUSE' | 'REPRISE';
type Heure = readonly [number, number];

const HORLOGE = new Date(2026, 8, 26, 10, 30).getTime();
const SEMAINE_DE_JOUR = '/operateurs/op-1/heures?annee=2026&semaine=39';
const SEMAINE_DE_NUIT = '/operateurs/op-1/heures?annee=2026&semaine=38';

interface JourDeMaquette {
  readonly pointe?: string;
  readonly presume?: string;
  readonly pointages?: readonly (readonly [TypeDePointage, Heure])[];
  readonly plages?: readonly (readonly [Heure, Heure | undefined, boolean?])[];
}

interface EnTeteAttendu {
  readonly jour: string;
  readonly duree: string;
  readonly aujourdhui?: string;
  readonly presumees?: string;
}

interface SemaineDeMaquette {
  readonly semaine: number;
  readonly lundi: number;
  readonly totalPointe: string;
  readonly totalPresume: string;
  readonly jours: readonly JourDeMaquette[];
}

const instantFixture = (lundi: number, rang: number, [heure, minute]: Heure): string =>
  new Date(2026, 8, lundi + rang, heure, minute).toISOString();

const dateFixture = (lundi: number, rang: number): string => new Date(Date.UTC(2026, 8, lundi + rang)).toISOString().slice(0, 10);

const semaineFixture = ({ semaine, lundi, totalPointe, totalPresume, jours }: SemaineDeMaquette): SemaineSemee => ({
  synthese: {
    annee: 2026,
    semaine,
    dureeTotale: totalPointe,
    dureePresumeeTotale: totalPresume,
    dureeOperationnelleTotale: 'PT0S',
    dureeOperationnellePresumeeTotale: 'PT0S',
    elements: [],
    operateur: { id: 'op-1', nom: 'Auve', prenom: 'Jean-Yves' },
    jours: jours.map((jour, rang) => ({
      jour: dateFixture(lundi, rang),
      duree: jour.pointe ?? 'PT0S',
      dureePresumee: jour.presume ?? 'PT0S',
      dureeOperationnelle: 'PT0S',
      dureeOperationnellePresumee: 'PT0S',
      pointages: (jour.pointages ?? []).map(([type, heure]) => ({
        type: type as RestPointage['type'],
        dateDeSurvenue: instantFixture(lundi, rang, heure),
      })),
    })),
  },
  feuille: {
    annee: 2026,
    semaine,
    operateur: { id: 'op-1', nom: 'Auve', prenom: 'Jean-Yves' },
    jours: jours.map((jour, rang) => ({
      jour: dateFixture(lundi, rang),
      presence: (jour.plages ?? []).map(([debut, fin, presumee]) => ({
        debut: instantFixture(lundi, rang, debut),
        ...(fin === undefined ? {} : { fin: instantFixture(lundi, rang, fin) }),
        presumee: presumee ?? false,
      })),
      activites: [],
    })),
  },
});

const samediEnCoursFixture: JourDeMaquette = {
  pointe: 'PT1H58M',
  pointages: [
    ['ARRIVEE', [8, 2]],
    ['PAUSE', [10, 0]],
    ['REPRISE', [10, 20]],
  ],
  plages: [
    [
      [8, 2],
      [10, 0],
    ],
    [[10, 20], undefined],
  ],
};

const samediEnPauseFixture: JourDeMaquette = {
  pointe: 'PT1H58M',
  pointages: [
    ['ARRIVEE', [8, 2]],
    ['PAUSE', [10, 0]],
  ],
  plages: [
    [
      [8, 2],
      [10, 0],
    ],
  ],
};

const semaineDeJourFixture = (samedi: JourDeMaquette): SemaineSemee =>
  semaineFixture({
    semaine: 39,
    lundi: 21,
    totalPointe: 'PT39H11M',
    totalPresume: 'PT5H20M',
    jours: [
      {
        pointe: 'PT8H31M',
        pointages: [
          ['ARRIVEE', [7, 2]],
          ['PAUSE', [12, 0]],
          ['REPRISE', [12, 45]],
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
      { presume: 'PT5H20M', pointages: [['ARRIVEE', [10, 20]]], plages: [[[10, 20], [15, 40], true]] },
      {
        pointe: 'PT7H50M',
        pointages: [
          ['ARRIVEE', [6, 55]],
          ['PAUSE', [10, 0]],
          ['REPRISE', [10, 15]],
          ['PAUSE', [12, 30]],
          ['REPRISE', [13, 10]],
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
        pointe: 'PT7H34M',
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
      samedi,
      {},
    ],
  });

const semaineDeNuitFixture = (): SemaineSemee =>
  semaineFixture({
    semaine: 38,
    lundi: 14,
    totalPointe: 'PT57H22M',
    totalPresume: 'PT0S',
    jours: [
      {
        pointe: 'PT11H27M',
        pointages: [
          ['REPRISE', [0, 20]],
          ['DEPART', [7, 5]],
          ['ARRIVEE', [18, 58]],
          ['PAUSE', [23, 40]],
        ],
        plages: [
          [
            [0, 20],
            [7, 5],
          ],
          [
            [18, 58],
            [23, 40],
          ],
        ],
      },
      {
        pointe: 'PT11H37M',
        pointages: [
          ['REPRISE', [0, 22]],
          ['DEPART', [7, 0]],
          ['ARRIVEE', [19, 1]],
        ],
        plages: [
          [
            [0, 22],
            [7, 0],
          ],
          [
            [19, 1],
            [24, 0],
          ],
        ],
      },
      {
        pointe: 'PT11H19M',
        pointages: [
          ['PAUSE', [2, 10]],
          ['REPRISE', [2, 40]],
          ['DEPART', [7, 4]],
        ],
        plages: [
          [
            [0, 0],
            [2, 10],
          ],
          [
            [2, 40],
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

  it('should draw an ordinary day as two blocks of presence and the break between them', () => {
    givenAWeekOfDayShifts(samediEnCoursFixture);
    whenVisiting(SEMAINE_DE_JOUR);

    thenTheColumnShows(0, { plages: 2, pauses: ['Pause'] });
  });

  it('should draw a working day abandoned without departure as presumed, beside its clocked zero', () => {
    givenAWeekOfDayShifts(samediEnCoursFixture);
    whenVisiting(SEMAINE_DE_JOUR);

    thenTheHeaderReads(1, { jour: 'mar. 22', duree: '0 h 00', presumees: '+ 5 h 20 présumées' });
    thenThePresumedEndReads(1, '15:40 présumée');
  });

  it('should name two short intervals clocked close together in one note', () => {
    givenAWeekOfDayShifts(samediEnCoursFixture);
    whenVisiting(SEMAINE_DE_JOUR);

    thenTheNoteOfTheColumnReads(3, ['15:10 – 15:14', '15:20 – 15:26']);
  });

  it('should display a working day of zero duration as zero hours, drawing nothing, never as without clocking', () => {
    givenAWeekOfDayShifts(samediEnCoursFixture);
    whenVisiting(SEMAINE_DE_JOUR);

    thenTheHeaderReads(4, { jour: 'ven. 25', duree: '0 h 00' });
    thenTheColumnShows(4, { plages: 0, pauses: [], sansPointage: false });
  });

  it('should mark today and the presence still in progress by the clocking that opened it', () => {
    givenAWeekOfDayShifts(samediEnCoursFixture);
    whenVisiting(SEMAINE_DE_JOUR);

    thenTheHeaderReads(5, { jour: 'sam. 26', aujourdhui: 'Aujourd’hui', duree: '1 h 58' });
    thenTheChipReads(5, 'synthese-plage-ouverte', ['Reprise 10:20', 'en cours']);
  });

  it('should mark a break taken today and not yet resumed as in progress', () => {
    givenAWeekOfDayShifts(samediEnPauseFixture);
    whenVisiting(SEMAINE_DE_JOUR);

    thenTheChipReads(5, 'synthese-pause-sans-reprise', ['Pause 10:00', 'en cours']);
  });

  it('should display an empty Sunday as without clocking', () => {
    givenAWeekOfDayShifts(samediEnCoursFixture);
    whenVisiting(SEMAINE_DE_JOUR);

    thenTheHeaderReads(6, { jour: 'dim. 27', duree: '—' });
    thenTheColumnShows(6, { plages: 0, pauses: [], sansPointage: true });
  });

  it('should total the clocked and the presumed time of the week apart', () => {
    givenAWeekOfDayShifts(samediEnCoursFixture);
    whenVisiting(SEMAINE_DE_JOUR);

    thenTheTotalsRead(['Pointé : 39 h 11', 'Présumé, à confirmer : 5 h 20']);
  });

  it('should open the axis onto the whole day and carry a night shift across midnight', () => {
    givenAWeekOfNightShifts();
    whenVisiting(SEMAINE_DE_NUIT);

    thenTheAxisRuns('00:00', '00:00');
    thenTheColumnStartsInABreakFromTheDayBefore(0, 'Pause depuis la veille jusqu’à 00:20');
    thenTheChipReads(0, 'synthese-pause-sans-reprise', ['Pause 23:40']);
    thenTheColumnStartsInABreakFromTheDayBefore(1, 'Pause depuis la veille jusqu’à 00:22');
    thenTheContinuationsRead(1, 'se poursuit');
    thenTheContinuationsRead(2, 'depuis la veille');
  });

  it('should mention no presumed time for a week that has none', () => {
    givenAWeekOfNightShifts();
    whenVisiting(SEMAINE_DE_NUIT);

    thenNoPresumedTimeIsMentioned();
  });

  it('should hold the seven days without scrolling at 1024 pixels', () => {
    givenAWeekOfDayShifts(samediEnCoursFixture);
    whenVisitingAt(SEMAINE_DE_JOUR, 1024);

    thenTheAgendaDoesNotScroll('synthese-des-heures-1024');
  });

  it('should hold the seven days of a night week at 1440 pixels', () => {
    givenAWeekOfNightShifts();
    whenVisitingAt(SEMAINE_DE_NUIT, 1440);

    thenTheAgendaDoesNotScroll('synthese-des-heures-nuit-1440');
  });

  it('should let the seven days scroll horizontally on a narrow viewport', () => {
    givenAWeekOfDayShifts(samediEnCoursFixture);
    whenVisitingAt(SEMAINE_DE_JOUR, 390);

    thenTheAgendaScrollsHorizontally();
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

  const givenAWeekOfDayShifts = (samedi: JourDeMaquette): void => {
    api.seed(semaineDeJourFixture(samedi));
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
  };

  const whenVisiting = (adresse: string): void => {
    whenVisitingAt(adresse, 1280);
  };

  const whenFocusingTheWeekSelector = (): void => {
    cy.get(dataSelector('synthese-semaine')).focus();
  };

  const colonne = (rang: number): Cypress.Chainable<JQuery> => cy.get(dataSelector('synthese-colonne')).eq(rang);

  const thenTheColumnShows = (rang: number, attendu: { plages: number; pauses: string[]; sansPointage?: boolean }): void => {
    colonne(rang).find(dataSelector('synthese-plage')).should('have.length', attendu.plages);
    colonne(rang)
      .find(dataSelector('synthese-pause'))
      .should($pauses => {
        expect([...$pauses].map(pause => pause.textContent.trim())).to.deep.equal(attendu.pauses);
      });
    colonne(rang)
      .find(dataSelector('synthese-jour-sans-pointage'))
      .should('have.length', attendu.sansPointage === true ? 1 : 0);
  };

  const thenTheHeaderReads = (rang: number, attendu: EnTeteAttendu): void => {
    cy.get(dataSelector('synthese-jour-cell'))
      .eq(rang)
      .should($entete => {
        const texte = (selector: string): string | undefined => $entete.find(dataSelector(selector)).text().trim() || undefined;
        expect({
          jour: texte('synthese-jour'),
          aujourdhui: texte('synthese-aujourdhui'),
          duree: texte('synthese-duree-cell'),
          presumees: texte('synthese-duree-presumee'),
        }).to.deep.equal({ aujourdhui: undefined, presumees: undefined, ...attendu });
      })
      .and('be.visible');
  };

  const thenThePresumedEndReads = (rang: number, fin: string): void => {
    colonne(rang)
      .find(dataSelector('synthese-plage-presumee'))
      .find(dataSelector('synthese-fin'))
      .should('have.text', fin)
      .and('be.visible');
  };

  const thenTheNoteOfTheColumnReads = (rang: number, lignes: string[]): void => {
    colonne(rang)
      .find(dataSelector('synthese-note'))
      .should('have.length', 1)
      .and('be.visible')
      .and($note => {
        expect([...$note.children()].map(ligne => ligne.textContent.trim())).to.deep.equal(lignes);
      });
  };

  const thenTheChipReads = (rang: number, selector: string, lignes: string[]): void => {
    colonne(rang)
      .find(dataSelector(selector))
      .should('be.visible')
      .and($puce => {
        expect([...$puce.children()].map(ligne => ligne.textContent.trim())).to.deep.equal(lignes);
      });
  };

  const thenTheTotalsRead = (totaux: string[]): void => {
    cy.get(dataSelector('synthese-total')).should('have.text', totaux[0]).and('be.visible');
    cy.get(dataSelector('synthese-total-presume')).should('have.text', totaux[1]).and('be.visible');
  };

  const thenTheAxisRuns = (premier: string, dernier: string): void => {
    cy.get(dataSelector('synthese-repere')).first().should('have.text', premier).and('be.visible');
    cy.get(dataSelector('synthese-repere')).last().should('have.text', dernier).and('be.visible');
  };

  const thenTheColumnStartsInABreakFromTheDayBefore = (rang: number, titre: string): void => {
    colonne(rang).find(dataSelector('synthese-pause')).first().should('have.attr', 'title', titre).and('have.css', 'top', '0px');
  };

  const thenTheContinuationsRead = (rang: number, texte: string): void => {
    colonne(rang)
      .find(`${dataSelector('synthese-debut')}, ${dataSelector('synthese-fin')}`)
      .should('contain.text', texte);
  };

  const thenNoPresumedTimeIsMentioned = (): void => {
    cy.get(dataSelector('synthese-total')).should('be.visible');
    cy.get(dataSelector('synthese-total-presume')).should('not.exist');
    cy.get(dataSelector('synthese-duree-presumee')).should('not.exist');
  };

  const thenTheAgendaDoesNotScroll = (capture: string): void => {
    cy.get(dataSelector('synthese-total')).should('be.visible');
    cy.get('[role="region"]').should($region => {
      expect($region[0]?.scrollWidth).to.equal($region[0]?.clientWidth);
    });
    cy.screenshot(capture, { capture: 'fullPage' });
  };

  const thenTheAgendaScrollsHorizontally = (): void => {
    cy.get(dataSelector('synthese-total')).should('exist');
    cy.get('[role="region"]').should($region => {
      expect($region[0]?.scrollWidth).to.be.greaterThan($region[0]?.clientWidth ?? 0);
    });
    cy.screenshot('synthese-des-heures-mobile', { capture: 'fullPage' });
  };

  const thenTheLoadingStatusIsVisible = (pending: { send: () => void }): void => {
    cy.get(dataSelector('synthese-loading')).should('be.visible');
    cy.then(() => {
      pending.send();
    });
    cy.get(dataSelector('synthese-total')).should('be.visible');
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
