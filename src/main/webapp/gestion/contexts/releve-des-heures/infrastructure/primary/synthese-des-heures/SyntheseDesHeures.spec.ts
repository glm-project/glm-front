import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { SyntheseDesHeuresFixture } from '@test/unit/fixtures/gestion/releve-des-heures/SyntheseDesHeuresFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { BehaviorSubject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DureeTravaillee } from '../../../domain/duree/DureeTravaillee';
import { IdentiteOperateur } from '../../../domain/releve/IdentiteOperateur';
import { InstantDeReleve } from '../../../domain/releve/InstantDeReleve';
import { JourDeReleve } from '../../../domain/releve/JourDeReleve';
import { PlageDeReleve } from '../../../domain/releve/PlageDeReleve';
import { PointageDeReleve } from '../../../domain/releve/PointageDeReleve';
import { ReleveDesHeures } from '../../../domain/releve/ReleveDesHeures';
import { SyntheseDesHeuresPort } from '../../../domain/releve/SyntheseDesHeuresPort';
import { TypeDePointage } from '../../../domain/releve/TypeDePointage';
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

class RouterFixture {
  readonly navigations: Record<string, number>[] = [];

  navigate(_commands: unknown[], extras?: { queryParams?: Record<string, number> }): Promise<boolean> {
    this.navigations.push(extras?.queryParams ?? {});
    return Promise.resolve(true);
  }
}

type Heure = readonly [number, number];

const instantFixture = (rang: number, [heure, minute]: Heure): InstantDeReleve =>
  new InstantDeReleve(new Date(2026, 8, 14 + rang, heure, minute).toISOString());

interface JourFixture {
  readonly operationnelle?: string;
  readonly operationnellePresumee?: string;
  readonly pointages?: readonly (readonly [TypeDePointage, Heure])[];
  readonly plages?: readonly (readonly [Heure, Heure | undefined, boolean?])[];
}

const jourFixture = (jour: JourCalendaire, rang: number, fiche: JourFixture): JourDeReleve =>
  new JourDeReleve({
    jour,
    operationnelPointe: new DureeTravaillee(fiche.operationnelle ?? 'PT0S'),
    operationnelPresume: new DureeTravaillee(fiche.operationnellePresumee ?? 'PT0S'),
    pointages: (fiche.pointages ?? []).map(([type, heure]) => new PointageDeReleve(type, instantFixture(rang, heure))),
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

const releveFixture = (semaine: SemaineISO, jours: Readonly<Record<number, JourFixture>>, totaux: TotauxFixture = {}): ReleveDesHeures =>
  new ReleveDesHeures(semaine, {
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

  it('should mark the daytime hours under the name of each day', async () => {
    givenSemaineSemee(new SemaineISO(2026, 38));

    await whenEcranAffiche();

    expect([reperesDuJour(0), reperesDuJour(6)]).toEqual([
      ['8 h', '14 h', '20 h'],
      ['8 h', '14 h', '20 h'],
    ]);
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

    expect([reperesDuJour(0), reperesDuJour(1)]).toEqual([
      ['0 h', '12 h', '24 h'],
      ['8 h', '14 h', '20 h'],
    ]);
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

    expect(textes('synthese-legende')).toEqual(['Pointé', 'Présumé (à confirmer)', 'En cours']);
  });

  it('should display the loading status until the report arrives', () => {
    givenLectureSuspendue();

    whenEcranMonte();

    expect(texte('synthese-loading')).toBe('Chargement de la synthèse…');
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

    expect(texte('synthese-adresse-invalide')).toContain('ne désigne pas une semaine que le calendrier porte');
    expect(portFixture.demandes).toEqual([]);
  });

  it('should refuse an address naming no operator and ask the server for nothing', async () => {
    givenAdresseSansOperateur();

    await whenEcranAffiche();

    expect(texte('synthese-adresse-invalide')).toContain('ne désigne pas une semaine que le calendrier porte');
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

    expect(texte('synthese-error')).toContain('Impossible de charger la synthèse des heures.');
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

  const reperesDuJour = (rang: number): string[] => {
    const entete = [...racine().querySelectorAll<HTMLElement>(dataSelector('synthese-jour-cell'))][rang];
    return [...(entete?.querySelectorAll<HTMLElement>(dataSelector('synthese-repere')) ?? [])].map(repere => normalise(repere.textContent));
  };

  const gauches = (selector: string): number[] =>
    [...racine().querySelectorAll<HTMLElement>(dataSelector(selector))].map(element => arrondi(element.style.left));

  const valeurChoisie = (selector: string): string => selectRequis(selector).value;

  const optionsDe = (selector: string): string[] => [...selectRequis(selector).options].map(option => option.value);
});
