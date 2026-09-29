import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { SyntheseDesHeuresFixture } from '@test/unit/fixtures/gestion/releve-des-heures/SyntheseDesHeuresFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DureeTravaillee } from '../../../domain/duree/DureeTravaillee';
import { CategorieDActivite } from '../../../domain/element/CategorieDActivite';
import { ElementDuReleve } from '../../../domain/element/ElementDuReleve';
import { ElementReleveId } from '../../../domain/element/ElementReleveId';
import { IntervalleDActivite } from '../../../domain/element/IntervalleDActivite';
import { PosteDeLElement } from '../../../domain/element/PosteDeLElement';
import { PosteReleveId } from '../../../domain/element/PosteReleveId';
import { TypeDElement } from '../../../domain/element/TypeDElement';
import { IdentiteOperateur } from '../../../domain/releve/IdentiteOperateur';
import { InstantDeReleve } from '../../../domain/releve/InstantDeReleve';
import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { PlageDeReleve } from '../../../domain/releve/PlageDeReleve';
import { PointageDElement } from '../../../domain/releve/PointageDElement';
import { PointageDePresence } from '../../../domain/releve/PointageDePresence';
import { ReleveDesHeures } from '../../../domain/releve/ReleveDesHeures';
import { SyntheseDesHeuresPort } from '../../../domain/releve/SyntheseDesHeuresPort';
import { TypeDePointageDElement, TypeDePointageDePresence } from '../../../domain/releve/TypeDePointage';
import { JourCalendaire } from '../../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../../domain/semaine/SemaineISO';
import { SyntheseDesHeures } from './SyntheseDesHeures';

const OPERATEUR = 'op-1';
const SEMAINE_EN_COURS = new SemaineISO(2026, 38);

class RouteFixture {
  readonly paramMap = new BehaviorSubject<ParamMap>(convertToParamMap({ operateur: OPERATEUR }));
  readonly queryParamMap = new BehaviorSubject<ParamMap>(convertToParamMap({}));

  demande(annee: string, semaine: string): void {
    this.queryParamMap.next(convertToParamMap({ annee, semaine }));
  }

  demandeBrute(parametres: Record<string, string>): void {
    this.queryParamMap.next(convertToParamMap(parametres));
  }
}

interface UrlTreeFixture {
  readonly queryParams: Record<string, string>;
}

class RouterFixture {
  readonly navigations: Record<string, number>[] = [];
  readonly events = EMPTY;

  createUrlTree(_commands: unknown[], extras?: { queryParams?: Record<string, string> }): UrlTreeFixture {
    return { queryParams: extras?.queryParams ?? {} };
  }

  serializeUrl(arbre: UrlTreeFixture): string {
    return `/?${new URLSearchParams(arbre.queryParams).toString()}`;
  }

  navigate(_commands: unknown[], extras?: { queryParams?: Record<string, number> }): Promise<boolean> {
    this.navigations.push(extras?.queryParams ?? {});
    return Promise.resolve(true);
  }
}

type Heure = readonly [number, number];

const instantFixture = (rang: number, [heure, minute]: Heure): InstantDeReleve =>
  new InstantDeReleve(new Date(2026, 8, 14 + rang, heure, minute).toISOString());

interface IntervalleFixture {
  readonly element?: string;
  readonly poste?: string;
  readonly categorie?: CategorieDActivite;
  readonly debut: Heure;
  readonly fin?: Heure;
  readonly presumee?: boolean;
}

interface PointageDElementFixture {
  readonly type: TypeDePointageDElement;
  readonly heure: Heure;
  readonly element?: string;
  readonly poste?: string;
}

interface JourFixture {
  readonly intervalles?: readonly IntervalleFixture[];
  readonly pointagesDElement?: readonly PointageDElementFixture[];
  readonly operationnelle?: string;
  readonly operationnellePresumee?: string;
  readonly pointages?: readonly (readonly [TypeDePointageDePresence, Heure])[];
  readonly plages?: readonly (readonly [Heure, Heure | undefined, boolean?])[];
}

const jourFixture = (jour: JourCalendaire, rang: number, fiche: JourFixture): JourDeReleve =>
  new JourDeReleve({
    jour,
    operationnelPointe: new DureeTravaillee(fiche.operationnelle ?? 'PT0S'),
    operationnelPresume: new DureeTravaillee(fiche.operationnellePresumee ?? 'PT0S'),
    intervalles: (fiche.intervalles ?? []).map(
      intervalle =>
        new IntervalleDActivite({
          element: new ElementReleveId(intervalle.element ?? 'element-1'),
          poste: intervalle.poste === undefined ? undefined : new PosteReleveId(intervalle.poste),
          nature: undefined,
          categorie: intervalle.categorie ?? 'TRAVAIL',
          debut: instantFixture(rang, intervalle.debut),
          fin: intervalle.fin === undefined ? undefined : instantFixture(rang, intervalle.fin),
          presumee: intervalle.presumee ?? false,
        }),
    ),
    pointages: [
      ...(fiche.pointages ?? []).map(([type, heure]) => new PointageDePresence(type, instantFixture(rang, heure))),
      ...(fiche.pointagesDElement ?? []).map(
        pointage =>
          new PointageDElement(pointage.type, instantFixture(rang, pointage.heure), {
            element: new ElementReleveId(pointage.element ?? 'element-1'),
            poste: pointage.poste === undefined ? undefined : new PosteReleveId(pointage.poste),
          }),
      ),
    ].sort((un, autre) => un.instant.value.getTime() - autre.instant.value.getTime()),
    plages: (fiche.plages ?? []).map(
      ([debut, fin, presumee]) =>
        new PlageDeReleve(instantFixture(rang, debut), fin === undefined ? undefined : instantFixture(rang, fin), presumee ?? false),
    ),
  });

interface TotauxFixture {
  readonly presencePresumee?: string;
  readonly operationnelle?: string;
  readonly operationnellePresumee?: string;
}

interface ElementFixture {
  readonly id?: string;
  readonly type?: TypeDElement;
  readonly nom?: string;
  readonly reference?: string;
  readonly description?: string;
  readonly postes?: readonly (readonly [string, string | undefined, string?])[];
  readonly duree?: string;
  readonly dureeNonConformite?: string;
  readonly dureePresumee?: string;
}

const elementFixture = (fiche: ElementFixture = {}): ElementDuReleve =>
  new ElementDuReleve({
    id: new ElementReleveId(fiche.id ?? 'element-1'),
    type: fiche.type ?? 'PRODUIT',
    nom: fiche.nom ?? 'PRD-2026-000015',
    reference: fiche.reference,
    description: fiche.description,
    duree: new DureeTravaillee(fiche.duree ?? 'PT0S'),
    dureeNonConformite: new DureeTravaillee(fiche.dureeNonConformite ?? 'PT0S'),
    dureePresumee: new DureeTravaillee(fiche.dureePresumee ?? 'PT0S'),
    postes: (fiche.postes ?? []).map(
      ([libelle, nature, id], rang) => new PosteDeLElement(new PosteReleveId(id ?? `poste-${String(rang)}`), libelle, nature),
    ),
  });

const releveFixture = (
  semaine: SemaineISO,
  jours: Readonly<Record<number, JourFixture>>,
  totaux: TotauxFixture = {},
  elements: readonly ElementDuReleve[] = [],
): ReleveDesHeures =>
  new ReleveDesHeures(semaine, {
    elements,
    operateur: new IdentiteOperateur('Dupont', 'Jean'),
    presencePointee: new DureeTravaillee('PT7H30M'),
    presencePresumee: new DureeTravaillee(totaux.presencePresumee ?? 'PT0S'),
    operationnelPointe: new DureeTravaillee(totaux.operationnelle ?? 'PT0S'),
    operationnelPresume: new DureeTravaillee(totaux.operationnellePresumee ?? 'PT0S'),
    jours: semaine.jours().map((jour, rang) => jourFixture(jour, rang, jours[rang] ?? {})),
  });

const jourTravailleFixture: JourFixture = {
  pointages: [
    ['ARRIVEE', [8, 2]],
    ['DEPART', [12, 0]],
    ['ARRIVEE', [13, 0]],
    ['DEPART', [17, 32]],
  ],
  plages: [
    [
      [8, 2],
      [12, 0],
    ],
    [
      [13, 0],
      [17, 32],
    ],
  ],
};

const jourAbandonneFixture: JourFixture = {
  pointages: [['ARRIVEE', [10, 20]]],
  plages: [[[10, 20], [15, 40], true]],
};

describe('Synthese des heures component', () => {
  let componentFixture: ComponentFixture<SyntheseDesHeures>;
  let portFixture: SyntheseDesHeuresFixture;
  let routeFixture: RouteFixture;
  let routerFixture: RouterFixture;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 17, 10, 0));
    portFixture = new SyntheseDesHeuresFixture();
    routeFixture = new RouteFixture();
    routerFixture = new RouterFixture();
    TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: SyntheseDesHeuresPort, useValue: portFixture },
        { provide: ActivatedRoute, useValue: routeFixture },
        { provide: Router, useValue: routerFixture },
      ],
    });
  });

  afterEach(() => {
    componentFixture.destroy();
    vi.useRealTimers();
  });

  it.each([
    ['synthese-semaine-libelle', 'Semaine 38 · 14–20 sept. 2026'],
    ['synthese-identite', 'Jean DUPONT'],
  ])('should display %s as %s for the week containing today', async (selector, attendu) => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(texte(selector)).toBe(attendu);
  });

  it('should display the operational time of each day as the server counted it, a dash for a day without clocking', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        0: {
          operationnelle: 'PT5H10M',
          pointages: [
            ['ARRIVEE', [8, 0]],
            ['DEPART', [14, 0]],
          ],
          plages: [
            [
              [8, 0],
              [14, 0],
            ],
          ],
        },
        1: {
          pointages: [
            ['ARRIVEE', [8, 0]],
            ['DEPART', [8, 0]],
          ],
        },
      }),
    );

    await whenEcranAffiche();

    expect(textes('synthese-operationnel-jour')).toEqual(['5 h 10', '0 h 00', '—', '—', '—', '—', '—']);
  });

  it('should display the operational time of the week as the server counted it', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, {}, { operationnelle: 'PT57H30M' }));

    await whenEcranAffiche();

    expect(texte('synthese-operationnel-total')).toBe('57 h 30');
  });

  it('should add the presumed operational time of a day under its clocked one', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        1: { operationnelle: 'PT2H', operationnellePresumee: 'PT1H30M', pointages: [['ARRIVEE', [8, 0]]] },
      }),
    );

    await whenEcranAffiche();

    expect([textes('synthese-operationnel-jour')[1], textes('synthese-operationnel-presume')]).toEqual(['2 h 00', ['+ 1 h 30 présumées']]);
  });

  it('should display the presumed operational time of the week, to be confirmed, beside the clocked one', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, {}, { operationnelle: 'PT2H', operationnellePresumee: 'PT1H30M' }));

    await whenEcranAffiche();

    expect([texte('synthese-operationnel-total'), texte('synthese-operationnel-total-presume')]).toEqual([
      '2 h 00',
      'Présumé, à confirmer : 1 h 30',
    ]);
  });

  it('should title the screen with the operational time, the client word', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(texte('synthese-titre')).toBe('Temps opérationnel');
  });

  it('should say that the operational time is clocked on the moulds and OFs, so that no one compares it to the presence', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect([texte('synthese-operationnel-libelle'), texte('synthese-operationnel-precision')]).toEqual([
      'Temps opérationnel',
      'pointé sur les moules et OF',
    ]);
  });

  it('should display the presence of the week as the server counted it, apart from the operational time', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, {}, { presencePresumee: 'PT5H20M', operationnelle: 'PT57H30M' }));

    await whenEcranAffiche();

    expect([
      texte('synthese-presence-libelle'),
      texte('synthese-presence-total'),
      texte('synthese-presence-total-presume'),
      texte('synthese-operationnel-total'),
    ]).toEqual(['Présence', '7 h 30', 'Présumé, à confirmer : 5 h 20', '57 h 30']);
  });

  it('should place a presence on the axis of its day, from its arrival to its departure', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        0: {
          pointages: [
            ['ARRIVEE', [8, 0]],
            ['DEPART', [12, 0]],
          ],
          plages: [
            [
              [8, 0],
              [12, 0],
            ],
          ],
        },
      }),
    );

    await whenEcranAffiche();

    expect(positions('synthese-presence-plage')).toEqual([[12.5, 25]]);
  });

  it('should state each presence of a day from its arrival to its departure', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect([textes('synthese-presence-plage'), titres('synthese-presence-plage')]).toEqual([
      ['Présence 08:02 – 12:00', 'Présence 13:00 – 17:32'],
      ['Présence 08:02 – 12:00', 'Présence 13:00 – 17:32'],
    ]);
  });

  it('should draw a presumed presence apart from a clocked one, its end read as presumed', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 1: jourAbandonneFixture }));

    await whenEcranAffiche();

    expect([nombreDe('synthese-presence-plage'), textes('synthese-presence-presumee')]).toEqual([0, ['Présence présumée 10:20 – 15:40']]);
  });

  it('should state a presence going on past midnight as going on, and its continuation as coming from the day before', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        0: {
          pointages: [['ARRIVEE', [19, 0]]],
          plages: [
            [
              [19, 0],
              [24, 0],
            ],
          ],
        },
        1: {
          pointages: [['DEPART', [7, 0]]],
          plages: [
            [
              [0, 0],
              [7, 0],
            ],
          ],
        },
      }),
    );

    await whenEcranAffiche();

    expect(textes('synthese-presence-plage')).toEqual([
      'Présence depuis 19:00, se poursuit le lendemain',
      'Présence depuis la veille jusqu’à 07:00',
    ]);
  });

  it('should open the axis of a day onto the whole day when a presence touches midnight', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        0: {
          pointages: [['ARRIVEE', [19, 0]]],
          plages: [
            [
              [19, 0],
              [24, 0],
            ],
          ],
        },
        1: {
          pointages: [['DEPART', [7, 0]]],
          plages: [
            [
              [0, 0],
              [7, 0],
            ],
          ],
        },
      }),
    );

    await whenEcranAffiche();

    expect(positions('synthese-presence-plage')).toEqual([
      [79.17, 20.83],
      [0, 29.17],
    ]);
  });

  it.each([
    ['starts before the daytime hours', [5, 30], [13, 0], [22.92, 31.25]],
    ['ends after the daytime hours', [14, 0], [22, 30], [58.33, 35.42]],
    ['runs exactly over the daytime hours', [6, 0], [22, 0], [0, 100]],
  ] as const)('should scale a day on %s according to the hours it draws', async (_cas, debut, fin, attendu) => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: { plages: [[debut, fin]] } }));

    await whenEcranAffiche();

    expect(positions('synthese-presence-plage')).toEqual([attendu]);
  });

  it('should mark a presence still in progress at the place where it began, rather than invent its end', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        3: {
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
        },
      }),
    );

    await whenEcranAffiche();

    expect([textes('synthese-presence-ouverte'), gauches('synthese-presence-ouverte'), nombreDe('synthese-presence-plage')]).toEqual([
      ['Présence depuis 10:20, en cours'],
      [27.08],
      1,
    ]);
  });

  it('should give each element of the week its row, named by its type, its number, its label and its workstations', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {}, {}, [
        elementFixture({
          type: 'PRODUIT',
          reference: '1015',
          description: 'Carter de pompe',
          postes: [
            ['DMU 50', 'Fraisage'],
            ['Mazak QT-200', undefined],
          ],
        }),
        elementFixture({ id: 'element-2', type: 'ORDRE_DE_FABRICATION', nom: 'OF-2026-000057' }),
      ]),
    );

    await whenEcranAffiche();

    expect([
      textes('synthese-element-type'),
      textes('synthese-element-numero'),
      textes('synthese-element-libelle'),
      textes('synthese-element-postes'),
    ]).toEqual([
      ['Moule', 'OF'],
      ['1015', 'OF-2026-000057'],
      ['Carter de pompe', ''],
      ['DMU 50 · Fraisage, Mazak QT-200', ''],
    ]);
  });

  it('should give each element row its week total as the server counted it', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {}, {}, [
        elementFixture({ duree: 'PT15H30M' }),
        elementFixture({ id: 'element-2', duree: 'PT2H5M' }),
      ]),
    );

    await whenEcranAffiche();

    expect(textes('synthese-element-total')).toEqual(['15 h 30', '2 h 05']);
  });

  it('should keep the row of an element that no bar draws, its total at zero', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, {}, {}, [elementFixture({ reference: '1015' })]));

    await whenEcranAffiche();

    expect([textes('synthese-element-numero'), textes('synthese-element-total')]).toEqual([['1015'], ['0 h 00']]);
  });

  it('should tell the non-conformity time of an element beside its total, and nothing for an element without any', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {}, {}, [
        elementFixture({ duree: 'PT15H30M', dureeNonConformite: 'PT50M' }),
        elementFixture({ id: 'element-2', duree: 'PT2H' }),
      ]),
    );

    await whenEcranAffiche();

    expect(textes('synthese-element-nc')).toEqual(['NC 0 h 50']);
  });

  it('should tell the presumed time of an element beside its total, and nothing for an element without any', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {}, {}, [
        elementFixture({ duree: 'PT15H30M', dureePresumee: 'PT1H30M' }),
        elementFixture({ id: 'element-2', duree: 'PT2H' }),
      ]),
    );

    await whenEcranAffiche();

    expect(textes('synthese-element-presume')).toEqual(['+ 1 h 30 présumées']);
  });

  it('should draw the work of an element on its row, in the column of its day, on the axis of that day', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: { intervalles: [{ debut: [8, 0], fin: [12, 0] }] } }, {}, [elementFixture()]));

    await whenEcranAffiche();

    expect(positions('synthese-barre-travail')).toEqual([[12.5, 25]]);
  });

  it('should draw a non-conformity apart from the work it follows, at its own place', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { debut: [8, 0], fin: [12, 0] },
              { categorie: 'NON_CONFORMITE', debut: [12, 0], fin: [14, 0] },
            ],
          },
        },
        {},
        [elementFixture()],
      ),
    );

    await whenEcranAffiche();

    expect([positions('synthese-barre-travail'), positions('synthese-barre-nc')]).toEqual([[[12.5, 25]], [[37.5, 12.5]]]);
  });

  it('should state each bar by its element, its day, its hours and whether it is work or non-conformity', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { debut: [8, 0], fin: [12, 0] },
              { categorie: 'NON_CONFORMITE', debut: [12, 0], fin: [14, 0] },
            ],
            pointagesDElement: [
              { type: 'DEBUT', heure: [8, 0] },
              { type: 'NON_CONFORMITE', heure: [12, 0] },
              { type: 'FIN', heure: [14, 0] },
            ],
          },
        },
        {},
        [elementFixture({ reference: '1015' })],
      ),
    );

    await whenEcranAffiche();

    expect([textes('synthese-barre-travail'), titres('synthese-barre-travail'), textes('synthese-barre-nc')]).toEqual([
      ['Moule 1015, lundi 14, 08:00 à 12:00, travail'],
      ['Moule 1015, lundi 14, 08:00 à 12:00, travail'],
      ['Moule 1015, lundi 14, 12:00 à 14:00, non-conformité'],
    ]);
  });

  it.each([
    ['starts before the daytime hours', [5, 30], [7, 0], [22.92, 6.25]],
    ['goes on past midnight', [21, 0], [24, 0], [87.5, 12.5]],
  ] as const)('should open the axis of a day onto the whole day when the work of an element %s', async (_cas, debut, fin, attendu) => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: { intervalles: [{ debut, fin }] } }, {}, [elementFixture()]));

    await whenEcranAffiche();

    expect(positions('synthese-barre-travail')).toEqual([attendu]);
  });

  it('should state a bar stopped without any clocked end, and mark nothing at its end', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        { 0: { intervalles: [{ debut: [8, 0], fin: [10, 0] }], pointagesDElement: [{ type: 'DEBUT', heure: [8, 0] }] } },
        {},
        [elementFixture({ reference: '1015' })],
      ),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect([textes('synthese-barre-travail'), marquesDuJourOuvert()]).toEqual([
      ['Moule 1015, lundi 14, 08:00 à 10:00, travail, arrêté sans fin pointée'],
      ['Début 08:00'],
    ]);
  });

  it('should mark the work still in progress at the place where it began, and state it as in progress', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, { 0: { intervalles: [{ debut: [10, 20] }] } }, {}, [elementFixture({ reference: '1015' })]),
    );

    await whenEcranAffiche();

    expect([textes('synthese-barre-ouverte'), gauches('synthese-barre-ouverte'), nombreDe('synthese-barre-travail')]).toEqual([
      ['Moule 1015, lundi 14, depuis 10:20, travail, en cours'],
      [27.08],
      0,
    ]);
  });

  it('should draw a presumed work apart from a clocked one, and state it as presumed', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, { 1: { intervalles: [{ debut: [10, 20], fin: [15, 40], presumee: true }] } }, {}, [
        elementFixture({ reference: '1015' }),
      ]),
    );

    await whenEcranAffiche();

    expect([textes('synthese-barre-presumee'), nombreDe('synthese-barre-travail')]).toEqual([
      ['Moule 1015, mardi 15, 10:20 à 15:40, travail, présumé'],
      0,
    ]);
  });

  it('should split the row of an element worked from two workstations at once into one sub-row per workstation, its total staying on its row', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
              { poste: 'poste-1', debut: [10, 0], fin: [14, 0] },
            ],
          },
        },
        {},
        [
          elementFixture({
            duree: 'PT8H',
            postes: [
              ['DMU 50', 'Fraisage'],
              ['Mazak QT-200', 'Tournage'],
            ],
          }),
        ],
      ),
    );

    await whenEcranAffiche();

    expect([textes('synthese-sous-ligne-poste'), positions('synthese-barre-travail'), textes('synthese-element-total')]).toEqual([
      ['DMU 50', 'Mazak QT-200'],
      [
        [12.5, 25],
        [25, 25],
      ],
      ['8 h 00'],
    ]);
  });

  it('should keep whole the row of an element worked from two workstations one after the other', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
              { poste: 'poste-1', debut: [12, 0], fin: [14, 0] },
            ],
          },
        },
        {},
        [
          elementFixture({
            postes: [
              ['DMU 50', 'Fraisage'],
              ['Mazak QT-200', 'Tournage'],
            ],
          }),
        ],
      ),
    );

    await whenEcranAffiche();

    expect([nombreDe('synthese-sous-ligne'), positions('synthese-barre-travail')]).toEqual([
      0,
      [
        [12.5, 25],
        [37.5, 12.5],
      ],
    ]);
  });

  it.each([
    [
      'after',
      [
        { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
        { poste: 'poste-1', debut: [10, 0] },
      ],
    ],
    [
      'before',
      [
        { poste: 'poste-1', debut: [10, 0] },
        { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
      ],
    ],
  ] as const)(
    'should split the row of an element for an interval still in progress that started within a closed one, listed %s it',
    async (_cas, intervalles) => {
      givenReleve(
        releveFixture(SEMAINE_EN_COURS, { 0: { intervalles } }, {}, [
          elementFixture({
            postes: [
              ['DMU 50', 'Fraisage'],
              ['Mazak QT-200', 'Tournage'],
            ],
          }),
        ]),
      );

      await whenEcranAffiche();

      expect(textes('synthese-sous-ligne-poste')).toEqual(['DMU 50', 'Mazak QT-200']);
    },
  );

  it('should give a workstation one sub-row when the element carries it for several natures', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
              { poste: 'poste-2', debut: [10, 0], fin: [14, 0] },
            ],
          },
        },
        {},
        [
          elementFixture({
            postes: [
              ['DMU 50', 'Fraisage'],
              ['DMU 50', 'Perçage', 'poste-0'],
              ['Mazak QT-200', 'Tournage'],
            ],
          }),
        ],
      ),
    );

    await whenEcranAffiche();

    expect(textes('synthese-sous-ligne-poste')).toEqual(['DMU 50', 'Mazak QT-200']);
  });

  it('should mark the closure of an element on the row of each workstation the departure stopped, and say it once in the journal', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            pointages: [['DEPART', [16, 0]]],
            intervalles: [
              { poste: 'poste-0', debut: [8, 0], fin: [16, 0] },
              { poste: 'poste-1', debut: [10, 0], fin: [16, 0] },
            ],
          },
        },
        {},
        [
          elementFixture({
            reference: '1015',
            postes: [
              ['DMU 50', 'Fraisage'],
              ['Mazak QT-200', 'Tournage'],
            ],
          }),
        ],
      ),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect([marquesParSousLigne(), entreesDuJournal().map(entree => entree[4])]).toEqual([[1, 1], ['clôt Moule 1015, sans fin pointée']]);
  });

  it('should split the row of an element worked from two workstations at once that are both still in progress', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { poste: 'poste-0', debut: [8, 0] },
              { poste: 'poste-1', debut: [10, 0] },
            ],
          },
        },
        {},
        [
          elementFixture({
            postes: [
              ['DMU 50', 'Fraisage'],
              ['Mazak QT-200', 'Tournage'],
            ],
          }),
        ],
      ),
    );

    await whenEcranAffiche();

    expect([textes('synthese-sous-ligne-poste'), nombreDe('synthese-barre-ouverte')]).toEqual([['DMU 50', 'Mazak QT-200'], 2]);
  });

  it('should put the work of a split element that has no workstation on a row of its own, said to have none', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
              { debut: [10, 0], fin: [14, 0] },
            ],
          },
        },
        {},
        [elementFixture({ postes: [['DMU 50', 'Fraisage']] })],
      ),
    );

    await whenEcranAffiche();

    expect(textes('synthese-sous-ligne-poste')).toEqual(['DMU 50', 'Sans poste']);
  });

  it('should split the whole week of an element as soon as two of its intervals overlap, each interval on the row of its workstation', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
              { poste: 'poste-1', debut: [10, 0], fin: [14, 0] },
            ],
          },
          1: { intervalles: [{ poste: 'poste-1', debut: [8, 0], fin: [9, 0] }] },
        },
        {},
        [
          elementFixture({
            postes: [
              ['DMU 50', 'Fraisage'],
              ['Mazak QT-200', 'Tournage'],
            ],
          }),
        ],
      ),
    );

    await whenEcranAffiche();

    expect(barresParSousLigne()).toEqual([
      [1, 0, 0, 0, 0, 0, 0],
      [1, 1, 0, 0, 0, 0, 0],
    ]);
  });

  it('should give each of the seven days its column', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(textes('synthese-jour')).toEqual(['lun. 14', 'mar. 15', 'mer. 16', 'jeu. 17', 'ven. 18', 'sam. 19', 'dim. 20']);
  });

  it.each(['synthese-operationnel-total-presume', 'synthese-presence-total-presume'])(
    'should display no %s for a week without presumed time',
    async selector => {
      givenSemaineSemee(new SemaineISO(2026, 38));

      await whenEcranAffiche();

      expect(present(selector)).toBe(false);
    },
  );

  it('should mark the daytime hours under the name of a day that carries something, and nothing under an empty one', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect([reperesDuJour(0), reperesDuJour(6)]).toEqual([['8 h', '20 h'], []]);
  });

  it('should mark the whole day, from 0 h to 24 h, under the name of a day whose axis a presence opened', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        0: {
          plages: [
            [
              [19, 0],
              [24, 0],
            ],
          ],
        },
      }),
    );

    await whenEcranAffiche();

    expect([reperesDuJour(0), reperesDuJour(1)]).toEqual([['0 h', '24 h'], []]);
  });

  it('should open today on the week in progress when the address names no day, empty as today may be', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(joursOuverts()).toEqual(['jeu. 17']);
  });

  it('should link each day to its own address, in the week that is shown', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect([cibleDuLien('synthese-jour-lien', 0), cibleDuLien('synthese-jour-lien', 6)]).toEqual([
      '/?annee=2026&semaine=38&jour=2026-09-14',
      '/?annee=2026&semaine=38&jour=2026-09-20',
    ]);
  });

  it('should open the day the address names, and only that one', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-16' });

    await whenEcranAffiche();

    expect(joursOuverts()).toEqual(['mer. 16']);
  });

  it('should open the first day that carries a clocking on a past week, when the address names no day', async () => {
    givenReleveDe(
      new SemaineISO(2026, 37),
      releveFixture(new SemaineISO(2026, 37), {
        1: { pointages: [['ARRIVEE', [8, 0]]] },
        4: { pointages: [['ARRIVEE', [8, 0]]] },
      }),
    );
    routeFixture.demande('2026', '37');

    await whenEcranAffiche();

    expect(joursOuverts()).toEqual(['mar. 8']);
  });

  it('should open no day on a past week that carries no clocking', async () => {
    givenReleveDe(new SemaineISO(2026, 37), releveFixture(new SemaineISO(2026, 37), {}));
    routeFixture.demande('2026', '37');

    await whenEcranAffiche();

    expect(joursOuverts()).toEqual([]);
  });

  it('should leave the day out of the links to the neighbouring weeks, the open day going with the week it belongs to', async () => {
    givenSemaineSemee(new SemaineISO(2026, 20));
    routeFixture.demandeBrute({ annee: '2026', semaine: '20', jour: '2026-05-13' });

    await whenEcranAffiche();

    expect([cibleDuLien('synthese-semaine-precedente', 0), cibleDuLien('synthese-semaine-suivante', 0)]).toEqual([
      '/?annee=2026&semaine=19',
      '/?annee=2026&semaine=21',
    ]);
  });

  it('should place the clockings of an element on its row in the open day, at their instant, and nowhere else', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [{ debut: [8, 0], fin: [14, 0] }],
            pointagesDElement: [
              { type: 'DEBUT', heure: [8, 0] },
              { type: 'NON_CONFORMITE', heure: [12, 0] },
              { type: 'FIN', heure: [14, 0] },
            ],
          },
          1: { pointagesDElement: [{ type: 'DEBUT', heure: [9, 0] }] },
        },
        {},
        [elementFixture()],
      ),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect(marquesDuJourOuvert()).toEqual(['Début 08:00', 'Non-conformité 12:00', 'Fin 14:00']);
  });

  it('should place a marker on the axis of the open day at the instant of its clocking', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            pointagesDElement: [
              { type: 'DEBUT', heure: [8, 0] },
              { type: 'FIN', heure: [14, 0] },
            ],
          },
        },
        {},
        [elementFixture()],
      ),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect(gauches('synthese-marque')).toEqual([12.5, 50]);
  });

  it('should keep a marker for a clocking that no bar surrounds, since the row of its element has to show it', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: { pointagesDElement: [{ type: 'FIN', heure: [17, 45] }] } }, {}, [elementFixture()]));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect([nombreDe('synthese-marque'), nombreDe('synthese-barre-travail')]).toEqual([1, 0]);
  });

  it('should list in the journal a clocking that no bar surrounds, under the name of its element', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: { pointagesDElement: [{ type: 'FIN', heure: [17, 45] }] } }, {}, [elementFixture()]));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect(entreesDuJournal()).toEqual([['17:45', 'Fin', 'Moule PRD-2026-000015', '', '']]);
  });

  it('should put the marker of a clocking on the row of the workstation it names when the element is split', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
              { poste: 'poste-1', debut: [10, 0], fin: [14, 0] },
            ],
            pointagesDElement: [
              { type: 'DEBUT', heure: [8, 0], poste: 'poste-0' },
              { type: 'DEBUT', heure: [10, 0], poste: 'poste-1' },
              { type: 'FIN', heure: [14, 0], poste: 'poste-1' },
            ],
          },
        },
        {},
        [
          elementFixture({
            postes: [
              ['DMU 50', 'Fraisage'],
              ['Mazak QT-200', 'Tournage'],
            ],
          }),
        ],
      ),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect(marquesParSousLigne()).toEqual([1, 2]);
  });

  it('should keep on a row said to have no workstation the marker of a clocking that names none when the element is split', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            intervalles: [
              { poste: 'poste-0', debut: [8, 0], fin: [12, 0] },
              { poste: 'poste-1', debut: [10, 0], fin: [14, 0] },
            ],
            pointagesDElement: [{ type: 'NON_CONFORMITE', heure: [11, 0] }],
          },
        },
        {},
        [
          elementFixture({
            postes: [
              ['DMU 50', 'Fraisage'],
              ['Mazak QT-200', 'Tournage'],
            ],
          }),
        ],
      ),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect([textes('synthese-sous-ligne-poste'), marquesParSousLigne()]).toEqual([
      ['DMU 50', 'Mazak QT-200', 'Sans poste'],
      [0, 0, 1],
    ]);
  });

  it('should draw a line across the open day at each arrival and each departure, and none in the other days', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        0: {
          pointages: [
            ['ARRIVEE', [8, 0]],
            ['DEPART', [16, 0]],
          ],
        },
        1: { pointages: [['ARRIVEE', [9, 0]]] },
      }),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect([gauches('synthese-trait-presence'), titres('synthese-trait-presence')]).toEqual([
      [12.5, 62.5],
      ['Arrivée 08:00', 'Départ 16:00'],
    ]);
  });

  it.each([
    ['2026-09-14', 'every two hours on the daytime axis', ['6 h', '8 h', '10 h', '12 h', '14 h', '16 h', '18 h', '20 h', '22 h']],
    ['2026-09-15', 'every third hour on the whole day', ['0 h', '3 h', '6 h', '9 h', '12 h', '15 h', '18 h', '21 h', '24 h']],
  ])('should mark the open day %s %s', async (jour, _cas, attendu) => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        1: {
          plages: [
            [
              [19, 0],
              [24, 0],
            ],
          ],
        },
      }),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour });

    await whenEcranAffiche();

    expect(reperesDuJour(jour === '2026-09-14' ? 0 : 1)).toEqual(attendu);
  });

  it('should list the clockings of the open day in the server order, presence and elements mixed', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            pointages: [
              ['ARRIVEE', [7, 0]],
              ['DEPART', [16, 0]],
            ],
            pointagesDElement: [
              { type: 'DEBUT', heure: [7, 5], poste: 'poste-0' },
              { type: 'FIN', heure: [12, 0], poste: 'poste-0' },
            ],
          },
        },
        {},
        [elementFixture({ reference: '1015', postes: [['DMU 50', 'Fraisage']] })],
      ),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect(entreesDuJournal()).toEqual([
      ['07:00', 'Arrivée', 'Présence', '', ''],
      ['07:05', 'Début', 'Moule 1015', 'DMU 50', ''],
      ['12:00', 'Fin', 'Moule 1015', 'DMU 50', ''],
      ['16:00', 'Départ', 'Présence', '', ''],
    ]);
  });

  it('should leave the workstation of a clocking empty when the clocking names none', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, { 0: { pointagesDElement: [{ type: 'DEBUT', heure: [7, 5] }] } }, {}, [
        elementFixture({ reference: '1015', postes: [['DMU 50', 'Fraisage']] }),
      ]),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect(entreesDuJournal()).toEqual([['07:05', 'Début', 'Moule 1015', '', '']]);
  });

  it('should title the journal with the day and the number of its clockings', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        0: {
          pointages: [
            ['ARRIVEE', [7, 0]],
            ['DEPART', [16, 0]],
          ],
        },
      }),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect(texte('synthese-journal-titre')).toBe('Pointages du lundi 14 septembre · 2');
  });

  it('should state an empty open day as without clocking, in place of the journal', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: { pointages: [['ARRIVEE', [7, 0]]] } }));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-15' });

    await whenEcranAffiche();

    expect([texte('synthese-journal-vide'), nombreDe('synthese-journal-entree')]).toEqual(['Aucun pointage ce jour', 0]);
  });

  it('should say that a departure closes the elements that no clocked end finishes at that instant', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            pointages: [['DEPART', [16, 0]]],
            intervalles: [
              { poste: 'poste-0', debut: [8, 0], fin: [16, 0] },
              { element: 'element-2', debut: [10, 0], fin: [16, 0] },
            ],
          },
        },
        {},
        [
          elementFixture({ reference: '1015', postes: [['DMU 50', 'Fraisage']] }),
          elementFixture({ id: 'element-2', type: 'ORDRE_DE_FABRICATION', nom: 'OF-2026-000057' }),
        ],
      ),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect(entreesDuJournal()).toEqual([['16:00', 'Départ', 'Présence', '', 'clôt Moule 1015 et OF OF-2026-000057, sans fin pointée']]);
  });

  it.each([
    ['a clocked end finishes it at the same instant', { pointagesDElement: [{ type: 'FIN', heure: [16, 0], poste: 'poste-0' }] }, ['', '']],
    [
      'no interval ends at the departure, the day being abandoned',
      { intervalles: [{ poste: 'poste-0', debut: [8, 0], fin: [15, 0] }] },
      [''],
    ],
  ] as const)('should not say that a departure closes an element when %s', async (_cas, jour, effets) => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            pointages: [['DEPART', [16, 0]]],
            intervalles: [{ poste: 'poste-0', debut: [8, 0], fin: [16, 0] }],
            ...jour,
          },
        },
        {},
        [elementFixture({ reference: '1015', postes: [['DMU 50', 'Fraisage']] })],
      ),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect(entreesDuJournal().map(entree => entree[4])).toEqual(effets);
  });

  it('should mark on the row of an element the departure that closed it without any clocked end', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        { 0: { pointages: [['DEPART', [16, 0]]], intervalles: [{ poste: 'poste-0', debut: [8, 0], fin: [16, 0] }] } },
        {},
        [elementFixture({ postes: [['DMU 50', 'Fraisage']] })],
      ),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect([marquesDuJourOuvert(), gauches('synthese-marque')]).toEqual([['Clos par le départ 16:00'], [62.5]]);
  });

  it('should situate a chosen clocking of the journal by a guide at its instant, across the frise', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        0: {
          pointages: [
            ['ARRIVEE', [8, 0]],
            ['DEPART', [16, 0]],
          ],
        },
      }),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });
    await whenEcranAffiche();

    await whenEntreeDuJournalChoisie(1);

    expect([entreesPressees(), gauches('synthese-repere-selection'), titres('synthese-repere-selection')]).toEqual([
      ['16:00'],
      [62.5],
      ['Départ 16:00'],
    ]);
  });

  it('should let go of a clocking chosen again, guide included', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: { pointages: [['ARRIVEE', [8, 0]]] } }));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });
    await whenEcranAffiche();
    await whenEntreeDuJournalChoisie(0);

    await whenEntreeDuJournalChoisie(0);

    expect([entreesPressees(), nombreDe('synthese-repere-selection')]).toEqual([[], 0]);
  });

  it('should choose no clocking when another day is opened', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: { pointages: [['ARRIVEE', [8, 0]]] }, 1: { pointages: [['ARRIVEE', [9, 0]]] } }));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });
    await whenEcranAffiche();
    await whenEntreeDuJournalChoisie(0);

    await whenAnotherDayIsOpened('2026-09-15');

    expect([entreesPressees(), nombreDe('synthese-repere-selection')]).toEqual([[], 0]);
  });

  it('should choose no clocking when another week is opened', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: { pointages: [['ARRIVEE', [8, 0]]] } }));
    const precedente = new SemaineISO(2026, 37);
    givenReleveDe(precedente, releveFixture(precedente, { 0: { pointages: [['ARRIVEE', [9, 0]]] } }));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });
    await whenEcranAffiche();
    await whenEntreeDuJournalChoisie(0);

    await whenAnotherWeekIsOpened({ annee: '2026', semaine: '37', jour: '2026-09-07' });

    expect([entreesDuJournal(), entreesPressees()]).toEqual([[['09:00', 'Arrivée', 'Présence', '', '']], []]);
  });

  it('should choose no clocking at the opening of a day', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: { pointages: [['ARRIVEE', [8, 0]]] } }));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect([entreesPressees(), nombreDe('synthese-repere-selection')]).toEqual([[], 0]);
  });

  it('should ring the marker of a chosen clocking of an element, and no other', async () => {
    givenReleve(
      releveFixture(
        SEMAINE_EN_COURS,
        {
          0: {
            pointagesDElement: [
              { type: 'DEBUT', heure: [8, 0] },
              { type: 'FIN', heure: [14, 0] },
            ],
          },
        },
        {},
        [elementFixture()],
      ),
    );
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });
    await whenEcranAffiche();

    await whenEntreeDuJournalChoisie(1);

    expect(marquesChoisies()).toEqual(['Fin 14:00']);
  });

  it.each([
    ['an isolated clocking of an element', { pointagesDElement: [{ type: 'FIN', heure: [5, 30] }] }, 22.92],
    ['a departure no interval or presence surrounds', { pointages: [['DEPART', [22, 45]]] }, 94.79],
  ] as const)('should open the axis of the open day onto the whole day for %s outside the daytime hours', async (_cas, jour, gauche) => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: jour }, {}, [elementFixture()]));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });

    await whenEcranAffiche();

    expect([reperesDuJour(0)[0], reperesDuJour(0).at(-1), gauches('synthese-marque').concat(gauches('synthese-trait-presence'))]).toEqual([
      '0 h',
      '24 h',
      [gauche],
    ]);
  });

  it('should keep the daytime axis of a closed day whose clocking, not drawn, lies outside the daytime hours', async () => {
    givenReleve(releveFixture(SEMAINE_EN_COURS, { 0: { pointagesDElement: [{ type: 'FIN', heure: [5, 30] }] } }, {}, [elementFixture()]));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-15' });

    await whenEcranAffiche();

    expect(reperesDuJour(0)).toEqual(['8 h', '20 h']);
  });

  it('should not read the report again when another day of the same week is opened', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));
    routeFixture.demandeBrute({ annee: '2026', semaine: '38', jour: '2026-09-14' });
    await whenEcranAffiche();

    await whenAnotherDayIsOpened('2026-09-15');

    expect(portFixture.demandes).toHaveLength(1);
  });

  it('should mark the column of today', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(jourMarqueAujourdhui()).toBe('jeu. 17');
  });

  it('should draw a day a presence covers without any clocking rather than call it empty', async () => {
    givenReleve(
      releveFixture(SEMAINE_EN_COURS, {
        0: {
          plages: [
            [
              [0, 0],
              [24, 0],
            ],
          ],
        },
      }),
    );

    await whenEcranAffiche();

    expect([nombreDe('synthese-presence-plage'), textes('synthese-operationnel-jour')[0]]).toEqual([1, '0 h 00']);
  });

  it('should explain each mark of the frise in its legend', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(textes('synthese-legende')).toEqual([
      'Travail',
      'Non-conformité',
      'Présence',
      'Présumé (à confirmer)',
      'En cours',
      'Début pointé',
      'Non-conformité pointée',
      'Fin pointée',
      'Clos par le départ',
      'Arrivée, départ',
    ]);
  });

  it('should display the loading status until the report arrives', () => {
    givenLectureSuspendue();

    whenEcranMonte();

    expect(texte('synthese-loading')).toBe('Chargement du temps opérationnel…');
  });

  it('should name the week of a report spanning two years', async () => {
    givenSemaineSemee(new SemaineISO(2026, 1));
    routeFixture.demande('2026', '1');

    await whenEcranAffiche();

    expect(texte('synthese-semaine-libelle')).toBe('Semaine 1 · 29 déc. 2025 – 4 janv. 2026');
  });

  it('should offer the year in progress and the five before it', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(optionsDe('synthese-annee')).toEqual(['2026', '2025', '2024', '2023', '2022', '2021']);
  });

  it.each([
    ['synthese-annee', '2026'],
    ['synthese-semaine', '38'],
  ])('should show %s selected on the week in progress', async (selector, attendu) => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(valeurChoisie(selector)).toBe(attendu);
  });

  it('should stop the weeks it offers at the week in progress', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(optionsDe('synthese-semaine')).toHaveLength(38);
  });

  it('should offer the fifty-three weeks of a long past year', async () => {
    givenSemaineSemee(new SemaineISO(2020, 10));
    routeFixture.demande('2020', '10');

    await whenEcranAffiche();

    expect(optionsDe('synthese-semaine')).toHaveLength(53);
  });

  it('should offer the fifty-two weeks of a short past year', async () => {
    givenSemaineSemee(new SemaineISO(2025, 10));
    routeFixture.demande('2025', '10');

    await whenEcranAffiche();

    expect(optionsDe('synthese-semaine')).toHaveLength(52);
  });

  it('should ask for another week when one is chosen', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));
    await whenEcranAffiche();

    await whenSemaineChoisie('12');

    expect(routerFixture.navigations).toEqual([{ annee: 2026, semaine: 12 }]);
  });

  it('should ask for the same week of another year when that year is chosen', async () => {
    givenSemaineSemee(new SemaineISO(2026, 20));
    routeFixture.demande('2026', '20');
    await whenEcranAffiche();

    await whenAnneeChoisie('2025');

    expect(routerFixture.navigations).toEqual([{ annee: 2025, semaine: 20 }]);
  });

  it('should fall back to the last week of a year that is shorter than the week in progress', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));
    await whenEcranAffiche();

    await whenAnneeChoisie('2025');

    expect(routerFixture.navigations).toEqual([{ annee: 2025, semaine: 38 }]);
  });

  it('should offer an earlier week on week one, which belongs to the previous year', async () => {
    givenSemaineSemee(new SemaineISO(2026, 1));
    routeFixture.demande('2026', '1');

    await whenEcranAffiche();

    expect(present('synthese-semaine-precedente')).toBe(true);
  });

  it('should offer a later week on a past week', async () => {
    givenSemaineSemee(new SemaineISO(2026, 20));
    routeFixture.demande('2026', '20');

    await whenEcranAffiche();

    expect(present('synthese-semaine-suivante')).toBe(true);
  });

  it('should offer no earlier week at the first week the calendar serves', async () => {
    givenSemaineSemee(new SemaineISO(2000, 1));
    routeFixture.demande('2000', '1');

    await whenEcranAffiche();

    expect(present('synthese-semaine-precedente')).toBe(false);
  });

  it('should offer no later week on the week in progress', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(present('synthese-semaine-suivante')).toBe(false);
  });

  it.each([
    [{ annee: '2025', semaine: '53' }],
    [{ annee: '1999', semaine: '1' }],
    [{ annee: 'abc', semaine: '38' }],
    [{ annee: '2026' }],
    [{ semaine: '38' }],
  ])('should refuse the week named by %o and ask the server for nothing', async parametres => {
    routeFixture.demandeBrute(parametres);

    await whenEcranAffiche();

    expect(texte('synthese-adresse-invalide')).toContain('ne désigne pas une semaine ou un jour que le calendrier porte');
    expect(portFixture.demandes).toEqual([]);
  });

  it.each([
    [{ annee: '2026', semaine: '38', jour: '2026-09-21' }],
    [{ jour: '2026-09-21' }],
    [{ annee: '2026', semaine: '38', jour: 'abc' }],
    [{ annee: '2026', semaine: '38', jour: '' }],
  ])('should refuse the day named by %o, out of the week or unreadable, and ask the server for nothing', async parametres => {
    routeFixture.demandeBrute(parametres);

    await whenEcranAffiche();

    expect([present('synthese-adresse-invalide'), portFixture.demandes]).toEqual([true, []]);
  });

  it('should refuse an address naming no operator and ask the server for nothing', async () => {
    givenAdresseSansOperateur();

    await whenEcranAffiche();

    expect(texte('synthese-adresse-invalide')).toContain('ne désigne pas une semaine ou un jour que le calendrier porte');
    expect(portFixture.demandes).toEqual([]);
  });

  it('should explain that the referential does not know this operator', async () => {
    givenOperateurInconnu();

    await whenEcranAffiche();

    expect(texte('synthese-operateur-introuvable')).toContain('n’existe plus au référentiel');
  });

  it('should display an error when the report cannot be read', async () => {
    givenLectureEnEchec();

    await whenEcranAffiche();

    expect(texte('synthese-error')).toContain('Impossible de charger le temps opérationnel de la semaine.');
  });

  it('should read the report again when the retry is used', async () => {
    givenLectureEnEchec();
    await whenEcranAffiche();

    await whenRepriseDemandee();

    expect(portFixture.demandes).toHaveLength(2);
  });

  it('should ask the server for the operator the URL names', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect(portFixture.demandes.map(demande => demande.operateur.value)).toEqual([OPERATEUR]);
  });

  const givenReleveDe = (semaine: SemaineISO, releve: ReleveDesHeures): void => {
    portFixture.releves.set(`${OPERATEUR}|${String(semaine.annee)}|${String(semaine.numero)}`, releve);
  };

  const givenReleve = (releve: ReleveDesHeures): void => {
    givenReleveDe(SEMAINE_EN_COURS, releve);
  };

  const givenSemaineSemee = (semaine: SemaineISO): void => {
    givenReleveDe(semaine, releveFixture(semaine, { 0: jourTravailleFixture }));
  };

  const givenOperateurInconnu = (): void => {
    portFixture.operateursInconnus.add(OPERATEUR);
  };

  const givenAdresseSansOperateur = (): void => {
    routeFixture.paramMap.next(convertToParamMap({}));
  };

  const givenLectureEnEchec = (): void => {
    portFixture.lectureFailure = new Error('panne');
  };

  const givenLectureSuspendue = (): void => {
    portFixture.lectureDifferee = new Promise(() => undefined);
  };

  const whenEcranMonte = (): void => {
    componentFixture = TestBed.createComponent(SyntheseDesHeures);
    componentFixture.detectChanges();
  };

  const whenEcranAffiche = async (): Promise<void> => {
    whenEcranMonte();
    await componentFixture.whenStable();
  };

  const whenEntreeDuJournalChoisie = async (rang: number): Promise<void> => {
    [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-journal-entree'))][rang]?.click();
    await componentFixture.whenStable();
  };

  const whenAnotherWeekIsOpened = async (adresse: { annee: string; semaine: string; jour: string }): Promise<void> => {
    routeFixture.demandeBrute(adresse);
    await componentFixture.whenStable();
  };

  const whenAnotherDayIsOpened = (jour: string): Promise<void> => whenAnotherWeekIsOpened({ annee: '2026', semaine: '38', jour });

  const whenSemaineChoisie = async (numero: string): Promise<void> => {
    const select = selectRequis('synthese-semaine');
    select.value = numero;
    select.dispatchEvent(new Event('change'));
    await componentFixture.whenStable();
  };

  const whenAnneeChoisie = async (annee: string): Promise<void> => {
    const select = selectRequis('synthese-annee');
    select.value = annee;
    select.dispatchEvent(new Event('change'));
    await componentFixture.whenStable();
  };

  const whenRepriseDemandee = async (): Promise<void> => {
    requis('synthese-retry').click();
    await componentFixture.whenStable();
  };

  const racine = (): HTMLElement => componentFixture.nativeElement as HTMLElement;

  const requis = (selector: string): HTMLElement => {
    const element = racine().querySelector<HTMLElement>(dataSelector(selector));
    if (element === null) {
      throw new Error(`Aucun élément ${selector} à l’écran`);
    }
    return element;
  };

  const selectRequis = (selector: string): HTMLSelectElement => {
    const element = racine().querySelector<HTMLSelectElement>(dataSelector(selector));
    if (element === null) {
      throw new Error(`Aucun sélecteur ${selector} à l’écran`);
    }
    return element;
  };

  const normalise = (valeur: string): string => valeur.replace(/[\u00a0\u2009\u202f]/g, ' ').trim();

  const texte = (selector: string): string => normalise(requis(selector).textContent);

  const textes = (selector: string): string[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector(selector))].map(element => normalise(element.textContent));

  const present = (selector: string): boolean => racine().querySelector(dataSelector(selector)) !== null;

  const nombreDe = (selector: string): number => racine().querySelectorAll(dataSelector(selector)).length;

  const jourMarqueAujourdhui = (): string =>
    normalise(
      requis('synthese-aujourdhui').closest(dataSelector('synthese-jour-cell'))?.querySelector(dataSelector('synthese-jour'))?.textContent
        ?? '',
    );

  const titres = (selector: string): string[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector(selector))].map(element => element.getAttribute('title') ?? '');

  const arrondi = (pourcentage: string): number => Math.round(Number.parseFloat(pourcentage) * 100) / 100;

  const positions = (selector: string): number[][] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector(selector))].map(element => [
      arrondi(element.style.left),
      arrondi(element.style.width),
    ]);

  const joursOuverts = (): string[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-jour-lien'))]
      .filter(lien => lien.getAttribute('aria-current') === 'true')
      .map(lien => normalise(lien.querySelector(dataSelector('synthese-jour'))?.textContent ?? ''));

  const cibleDuLien = (selector: string, rang: number): string =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector(selector))][rang]?.getAttribute('href') ?? '';

  const entreesPressees = (): string[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-journal-entree'))]
      .filter(entree => entree.getAttribute('aria-pressed') === 'true')
      .map(entree => normalise(entree.querySelector(dataSelector('synthese-journal-heure'))?.textContent ?? ''));

  const entreesDuJournal = (): string[][] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-journal-entree'))].map(entree =>
      ['heure', 'pointage', 'objet', 'poste', 'effet'].map(colonne =>
        normalise(entree.querySelector(dataSelector(`synthese-journal-${colonne}`))?.textContent ?? ''),
      ),
    );

  const marquesChoisies = (): string[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-marque-selectionnee'))].map(
      marque => marque.getAttribute('title') ?? '',
    );

  const marquesDuJourOuvert = (): string[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-marque'))].map(marque => marque.getAttribute('title') ?? '');

  const marquesParSousLigne = (): number[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-sous-ligne'))].map(
      sousLigne => sousLigne.querySelectorAll(dataSelector('synthese-marque')).length,
    );

  const reperesDuJour = (rang: number): string[] => {
    const entete = [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-jour-cell'))][rang];
    return [...(entete?.querySelectorAll<HTMLElement>(dataSelector('synthese-repere')) ?? [])].map(repere => normalise(repere.textContent));
  };

  const barresParSousLigne = (): number[][] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-sous-ligne'))].map(sousLigne =>
      [...sousLigne.querySelectorAll<HTMLElement>(dataSelector('synthese-sous-ligne-jour'))].map(
        cellule => cellule.querySelectorAll(`${dataSelector('synthese-barre-travail')}, ${dataSelector('synthese-barre-nc')}`).length,
      ),
    );

  const gauches = (selector: string): number[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector(selector))].map(element => arrondi(element.style.left));

  const valeurChoisie = (selector: string): string => selectRequis(selector).value;

  const optionsDe = (selector: string): string[] => [...selectRequis(selector).options].map(option => option.value);
});
