import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { SyntheseDesHeuresFixture } from '@test/unit/fixtures/gestion/releve-des-heures/SyntheseDesHeuresFixture';
import { defer, Observable, of, switchMap, throwError } from 'rxjs';
import { DureeTravaillee } from '../../domain/duree/DureeTravaillee';
import { IdentiteOperateur } from '../../domain/releve/IdentiteOperateur';
import { InstantDeReleve } from '../../domain/releve/InstantDeReleve';
import { JourDeReleve } from '../../domain/releve/JourDeReleve';
import { OperateurReleveId } from '../../domain/releve/OperateurReleveId';
import { PlageDeReleve } from '../../domain/releve/PlageDeReleve';
import { PointageDeReleve } from '../../domain/releve/PointageDeReleve';
import { ReleveDesHeures } from '../../domain/releve/ReleveDesHeures';
import { DemandeDeReleve, SyntheseDesHeuresPort } from '../../domain/releve/SyntheseDesHeuresPort';
import { JourCalendaire } from '../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../domain/semaine/SemaineISO';
import { HttpSyntheseDesHeures } from './HttpSyntheseDesHeures';

type RestSynthese = components['schemas']['RestSyntheseDesHeures'];
type RestJour = components['schemas']['RestJourDeSynthese'];
type RestFeuille = components['schemas']['RestFeuilleDeTemps'];
type RestJourDeFeuille = components['schemas']['RestJourDeLaSemaine'];
type RestPlage = components['schemas']['RestPlage'];

const ROUTE_SYNTHESE = '/api/syntheses-des-heures';
const ROUTE_FEUILLE = '/api/feuilles-de-temps';
const OPERATEUR = 'op-1';
const SYNTHESE_INTROUVABLE = 'urn:glm:erreur:synthese-des-heures:operateur-introuvable';
const FEUILLE_INTROUVABLE = 'urn:glm:erreur:feuille-de-temps:operateur-introuvable';
const SEMAINE = new SemaineISO(2026, 38);
const DEMANDE = new DemandeDeReleve(new OperateurReleveId(OPERATEUR), SEMAINE);

interface PointageFixture {
  readonly type: 'ARRIVEE' | 'DEPART';
  readonly instant: string;
}

interface PlageFixture {
  readonly debut: string;
  readonly fin?: string;
  readonly presumee: boolean;
}

interface JourFixture {
  readonly pointee: string;
  readonly presumee: string;
  readonly pointages: readonly PointageFixture[];
  readonly plages: readonly PlageFixture[];
}

const jourTravailleFixture: JourFixture = {
  pointee: 'PT7H30M',
  presumee: 'PT0S',
  pointages: [
    { type: 'ARRIVEE', instant: '2026-09-14T06:02:00Z' },
    { type: 'DEPART', instant: '2026-09-14T15:32:00Z' },
  ],
  plages: [{ debut: '2026-09-14T06:02:00Z', fin: '2026-09-14T15:32:00Z', presumee: false }],
};

const jourAbandonneFixture: JourFixture = {
  pointee: 'PT0S',
  presumee: 'PT5H20M',
  pointages: [{ type: 'ARRIVEE', instant: '2026-09-15T08:20:00Z' }],
  plages: [{ debut: '2026-09-15T08:20:00Z', fin: '2026-09-15T13:40:00Z', presumee: true }],
};

const jourEnCoursFixture: JourFixture = {
  pointee: 'PT0S',
  presumee: 'PT0S',
  pointages: [{ type: 'ARRIVEE', instant: '2026-09-16T06:00:00Z' }],
  plages: [{ debut: '2026-09-16T06:00:00Z', presumee: false }],
};

const jourVideFixture: JourFixture = { pointee: 'PT0S', presumee: 'PT0S', pointages: [], plages: [] };

const semaineFixture = (): readonly JourFixture[] => [
  jourTravailleFixture,
  jourAbandonneFixture,
  jourEnCoursFixture,
  jourVideFixture,
  jourVideFixture,
  jourVideFixture,
  jourVideFixture,
];

interface ProjectionPlage {
  readonly debut: string;
  readonly fin: string | undefined;
  readonly presumee: boolean;
}

interface ProjectionJour {
  readonly jour: string;
  readonly minutesPointees: number;
  readonly minutesPresumees: number;
  readonly pointages: readonly string[];
  readonly plages: readonly ProjectionPlage[];
}

const projeterPlage = (plage: PlageDeReleve): ProjectionPlage => ({
  debut: plage.debut.value.toISOString(),
  fin: plage.fin?.value.toISOString(),
  presumee: plage.presumee,
});

const projeterJour = (jour: JourDeReleve): ProjectionJour => ({
  jour: jour.jour.value,
  minutesPointees: jour.dureePointee.minutes,
  minutesPresumees: jour.dureePresumee.minutes,
  pointages: jour.pointages.map(pointage => `${pointage.type} ${pointage.instant.value.toISOString()}`),
  plages: jour.plages.map(projeterPlage),
});

const jourDeLaSemaine = (rang: number): string => {
  const jour = SEMAINE.jours()[rang];
  if (jour === undefined) {
    throw new Error(`La semaine ne porte pas de jour de rang ${String(rang)}`);
  }
  return jour.value;
};

const toRestJour = (jour: JourFixture, rang: number): RestJour => ({
  jour: jourDeLaSemaine(rang),
  duree: jour.pointee,
  dureePresumee: jour.presumee,
  dureeOperationnelle: 'PT0S',
  dureeOperationnellePresumee: 'PT0S',
  pointages: jour.pointages.map(pointage => ({ type: pointage.type, dateDeSurvenue: pointage.instant })),
});

const toRestPlage = (plage: PlageFixture): RestPlage => ({ ...plage });

const toRestJourDeFeuille = (jour: JourFixture, rang: number): RestJourDeFeuille => ({
  jour: jourDeLaSemaine(rang),
  presence: jour.plages.map(toRestPlage),
  activites: [],
});

const sansChamp = <T extends object>(document: T, champ: keyof T & string): T =>
  Object.fromEntries(Object.entries(document).filter(([cle]) => cle !== champ)) as T;

const premierDe = <T>(elements: readonly T[] | undefined): T => {
  const element = elements?.[0];
  if (element === undefined) {
    throw new Error('Le document de scénario ne porte aucun élément');
  }
  return element;
};

const avecPremierRetouche = <T>(elements: readonly T[] | undefined, retouche: (premier: T) => T): T[] => [
  retouche(premierDe(elements)),
  ...(elements ?? []).slice(1),
];

const toRestSynthese = (jours: readonly JourFixture[]): RestSynthese => ({
  annee: SEMAINE.annee,
  semaine: SEMAINE.numero,
  dureeTotale: 'PT7H30M',
  dureePresumeeTotale: 'PT5H20M',
  dureeOperationnelleTotale: 'PT0S',
  dureeOperationnellePresumeeTotale: 'PT0S',
  operateur: { id: OPERATEUR, nom: 'Dupont', prenom: 'Jean' },
  jours: jours.map(toRestJour),
  elements: [],
});

const toRestFeuille = (jours: readonly JourFixture[]): RestFeuille => ({
  annee: SEMAINE.annee,
  semaine: SEMAINE.numero,
  operateur: { id: OPERATEUR, nom: 'Dupont', prenom: 'Jean' },
  jours: jours.map(toRestJourDeFeuille),
});

const toPlage = (plage: PlageFixture): PlageDeReleve =>
  new PlageDeReleve(new InstantDeReleve(plage.debut), plage.fin === undefined ? undefined : new InstantDeReleve(plage.fin), plage.presumee);

const toDomain = (jours: readonly JourFixture[]): ReleveDesHeures =>
  new ReleveDesHeures(SEMAINE, {
    operateur: new IdentiteOperateur('Dupont', 'Jean'),
    totalPointe: new DureeTravaillee('PT7H30M'),
    totalPresume: new DureeTravaillee('PT5H20M'),
    jours: jours.map(
      (jour, rang) =>
        new JourDeReleve({
          jour: new JourCalendaire(jourDeLaSemaine(rang)),
          dureePointee: new DureeTravaillee(jour.pointee),
          dureePresumee: new DureeTravaillee(jour.presumee),
          pointages: jour.pointages.map(pointage => new PointageDeReleve(pointage.type, new InstantDeReleve(pointage.instant))),
          plages: jour.plages.map(toPlage),
        }),
    ),
  });

class ReleveHttpBackendFixture implements HttpBackend {
  jours: readonly JourFixture[] = [];
  operateurInconnu = false;

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    return defer(() => this.answer(request.url.startsWith(ROUTE_FEUILLE))).pipe(
      switchMap(answer => (answer instanceof HttpErrorResponse ? throwError(() => answer) : of(answer))),
    );
  }

  private async answer(feuille: boolean): Promise<HttpResponse<unknown> | HttpErrorResponse> {
    await new Promise(resolve => setTimeout(resolve));
    if (this.operateurInconnu) {
      const type = feuille ? FEUILLE_INTROUVABLE : SYNTHESE_INTROUVABLE;
      return new HttpErrorResponse({ status: 404, statusText: 'Not Found', error: { type } });
    }
    return new HttpResponse({ status: 200, body: feuille ? toRestFeuille(this.jours) : toRestSynthese(this.jours) });
  }
}

interface SyntheseHarness {
  readonly port: SyntheseDesHeuresPort;
  seed(jours: readonly JourFixture[]): void;
  seedOperateurInconnu(): void;
}

const createHttpHarness = (): SyntheseHarness => {
  const backend = new ReleveHttpBackendFixture();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      { provide: HttpBackend, useValue: backend },
      ApiClient,
      { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      HttpSyntheseDesHeures,
    ],
  });
  return {
    port: TestBed.inject(HttpSyntheseDesHeures),
    seed: (jours: readonly JourFixture[]) => {
      backend.jours = [...jours];
    },
    seedOperateurInconnu: () => {
      backend.operateurInconnu = true;
    },
  };
};

const createFixtureHarness = (): SyntheseHarness => {
  const fixture = new SyntheseDesHeuresFixture();
  return {
    port: fixture,
    seed: (jours: readonly JourFixture[]) => {
      fixture.releves.set(`${OPERATEUR}|2026|38`, toDomain(jours));
    },
    seedOperateurInconnu: () => {
      fixture.operateursInconnus.add(OPERATEUR);
    },
  };
};

const adapters: [string, () => SyntheseHarness][] = [
  ['HttpSyntheseDesHeures', createHttpHarness],
  ['SyntheseDesHeuresFixture', createFixtureHarness],
];

describe.each(adapters)('SyntheseDesHeuresPort contract, honoured by %s', (_adapter, createHarness) => {
  let harness: SyntheseHarness;
  let port: SyntheseDesHeuresPort;

  beforeEach(() => {
    harness = createHarness();
    port = harness.port;
  });

  it('should return the seven days of the requested week in calendar order', async () => {
    givenSemaine(semaineFixture());

    const releve = await port.synthese(DEMANDE);

    expect(releve?.jours.map(jour => jour.jour.value)).toEqual([
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
      '2026-09-20',
    ]);
  });

  it('should return the clocked time, the clockings and the presence of a worked day', async () => {
    givenSemaine(semaineFixture());

    const releve = await port.synthese(DEMANDE);

    expect(releve?.jours.map(projeterJour)[0]).toEqual({
      jour: '2026-09-14',
      minutesPointees: 450,
      minutesPresumees: 0,
      pointages: ['ARRIVEE 2026-09-14T06:02:00.000Z', 'DEPART 2026-09-14T15:32:00.000Z'],
      plages: [{ debut: '2026-09-14T06:02:00.000Z', fin: '2026-09-14T15:32:00.000Z', presumee: false }],
    });
  });

  it('should return the presumed time and the presumed interval of an abandoned working day', async () => {
    givenSemaine(semaineFixture());

    const releve = await port.synthese(DEMANDE);

    expect(releve?.jours.map(projeterJour)[1]).toMatchObject({
      minutesPointees: 0,
      minutesPresumees: 320,
      plages: [{ debut: '2026-09-15T08:20:00.000Z', fin: '2026-09-15T13:40:00.000Z', presumee: true }],
    });
  });

  it('should return the interval of a working day still in progress without an end', async () => {
    givenSemaine(semaineFixture());

    const releve = await port.synthese(DEMANDE);

    expect(releve?.jours.map(projeterJour)[2]?.plages).toEqual([{ debut: '2026-09-16T06:00:00.000Z', fin: undefined, presumee: false }]);
  });

  it('should return a day carrying neither clocking nor interval as an empty day', async () => {
    givenSemaine(semaineFixture());

    const releve = await port.synthese(DEMANDE);

    expect(releve?.jours[3]?.estVide()).toBe(true);
  });

  it('should return the clocked and presumed week totals the server computed', async () => {
    givenSemaine(semaineFixture());

    const releve = await port.synthese(DEMANDE);

    expect([releve?.totalPointe.minutes, releve?.totalPresume.minutes]).toEqual([450, 320]);
  });

  it('should return the operator the report resolved', async () => {
    givenSemaine(semaineFixture());

    const releve = await port.synthese(DEMANDE);

    expect(releve?.operateur).toMatchObject({ nom: 'Dupont', prenom: 'Jean' });
  });

  it('should answer nothing for an operator the referential does not know', async () => {
    givenOperateurInconnu();

    const releve = await port.synthese(DEMANDE);

    expect(releve).toBeUndefined();
  });

  const givenSemaine = (jours: readonly JourFixture[]): void => {
    harness.seed(jours);
  };

  const givenOperateurInconnu = (): void => {
    harness.seedOperateurInconnu();
  };
});

describe('Beyond the contract: HttpSyntheseDesHeures', () => {
  let port: SyntheseDesHeuresPort;
  let server: HttpTestingController;
  let errorHandler: ErrorHandlerFixture;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiClient,
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
        HttpSyntheseDesHeures,
      ],
    });
    port = TestBed.inject(HttpSyntheseDesHeures);
    server = TestBed.inject(HttpTestingController);
    errorHandler = TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture;
  });

  afterEach(() => {
    server.verify();
  });

  it.each([ROUTE_SYNTHESE, ROUTE_FEUILLE])('should ask %s for the requested operator, year and week', async route => {
    const result = port.synthese(DEMANDE);
    const requests = await whenBothRoutesAnswer(toRestSynthese(semaineFixture()), toRestFeuille(semaineFixture()));

    await result;
    const parametres = requests.get(route)?.request.params;
    expect([parametres?.get('annee'), parametres?.get('semaine')]).toEqual(['2026', '38']);
  });

  it('should keep the clockings on an element out of the presence journal of the day', async () => {
    const synthese = toRestSynthese(semaineFixture());
    const pointageDElement = { type: 'DEBUT' as const, dateDeSurvenue: '2026-09-14T06:05:00Z', element: 'carter', poste: 'dmu-50' };
    const result = port.synthese(DEMANDE);
    await whenBothRoutesAnswer(
      {
        ...synthese,
        jours: avecPremierRetouche(synthese.jours, jour => ({ ...jour, pointages: [...(jour.pointages ?? []), pointageDElement] })),
      },
      toRestFeuille(semaineFixture()),
    );

    const releve = await result;
    expect(releve?.jours.map(projeterJour)[0]?.pointages).toEqual(['ARRIVEE 2026-09-14T06:02:00.000Z', 'DEPART 2026-09-14T15:32:00.000Z']);
  });

  it('should give each day of the report the presence the time sheet carries for the same date', async () => {
    const feuille = toRestFeuille(semaineFixture());
    const result = port.synthese(DEMANDE);
    await whenBothRoutesAnswer(toRestSynthese(semaineFixture()), { ...feuille, jours: [...(feuille.jours ?? [])].reverse() });

    const releve = await result;
    expect(releve?.jours.map(jour => jour.plages.length)).toEqual([1, 1, 1, 0, 0, 0, 0]);
  });

  it.each([
    ['a day of another week', (jours: RestJourDeFeuille[]) => [...jours.slice(0, 6), { jour: '2026-09-21', presence: [], activites: [] }]],
    ['fewer days than the report', (jours: RestJourDeFeuille[]) => jours.slice(0, 6)],
    ['a day twice in place of another', (jours: RestJourDeFeuille[]) => [...jours.slice(0, 6), premierDe(jours)]],
    ['the seven days and one of them twice', (jours: RestJourDeFeuille[]) => [...jours, premierDe(jours)]],
  ])('should reject a time sheet carrying %s', async (_cas, retouche) => {
    const feuille = toRestFeuille(semaineFixture());
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    await whenBothRoutesAnswer(toRestSynthese(semaineFixture()), { ...feuille, jours: retouche(feuille.jours ?? []) });

    expect(await result).toEqual(new Error('La feuille de temps reçue du serveur ne porte pas les jours de la synthèse.'));
    expect(errorHandler.errors).toHaveLength(1);
  });

  it.each<keyof RestSynthese>(['annee', 'semaine', 'dureeTotale', 'dureePresumeeTotale', 'operateur', 'jours'])(
    'should reject a server answer missing synthese.%s',
    async champ => {
      const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
      await whenBothRoutesAnswer(sansChamp(toRestSynthese(semaineFixture()), champ), toRestFeuille(semaineFixture()));

      expect(await result).toEqual(new Error(`synthese.${champ} manque dans la réponse du serveur`));
    },
  );

  it.each<keyof RestJour>(['jour', 'duree', 'dureePresumee', 'pointages'])('should reject a server answer missing jour.%s', async champ => {
    const synthese = toRestSynthese(semaineFixture());
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    await whenBothRoutesAnswer(
      { ...synthese, jours: avecPremierRetouche(synthese.jours, jour => sansChamp(jour, champ)) },
      toRestFeuille(semaineFixture()),
    );

    expect(await result).toEqual(new Error(`jour.${champ} manque dans la réponse du serveur`));
  });

  it.each<keyof RestFeuille>(['annee', 'semaine', 'jours'])('should reject a server answer missing feuille.%s', async champ => {
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    await whenBothRoutesAnswer(toRestSynthese(semaineFixture()), sansChamp(toRestFeuille(semaineFixture()), champ));

    expect(await result).toEqual(new Error(`feuille.${champ} manque dans la réponse du serveur`));
  });

  it.each<keyof RestJourDeFeuille>(['jour', 'presence'])('should reject a server answer missing jourDeLaFeuille.%s', async champ => {
    const feuille = toRestFeuille(semaineFixture());
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    await whenBothRoutesAnswer(toRestSynthese(semaineFixture()), {
      ...feuille,
      jours: avecPremierRetouche(feuille.jours, jour => sansChamp(jour, champ)),
    });

    expect(await result).toEqual(new Error(`jourDeLaFeuille.${champ} manque dans la réponse du serveur`));
  });

  it('should reject a server answer missing plage.debut', async () => {
    const feuille = toRestFeuille(semaineFixture());
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    await whenBothRoutesAnswer(toRestSynthese(semaineFixture()), {
      ...feuille,
      jours: avecPremierRetouche(feuille.jours, jour => ({ ...jour, presence: [sansChamp(premierDe(jour.presence), 'debut')] })),
    });

    expect(await result).toEqual(new Error('plage.debut manque dans la réponse du serveur'));
  });

  it('should reject a synthesis the server answered for another week', async () => {
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    await whenBothRoutesAnswer({ ...toRestSynthese(semaineFixture()), semaine: 37 }, toRestFeuille(semaineFixture()));

    expect(await result).toEqual(new Error('La semaine reçue du serveur n’est pas celle demandée.'));
  });

  it('should reject a time sheet the server answered for another week', async () => {
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    await whenBothRoutesAnswer(toRestSynthese(semaineFixture()), { ...toRestFeuille(semaineFixture()), semaine: 37 });

    expect(await result).toEqual(new Error('La semaine reçue du serveur n’est pas celle demandée.'));
  });

  it('should reject a week that does not carry seven days', async () => {
    const synthese = toRestSynthese(semaineFixture());
    const feuille = toRestFeuille(semaineFixture());
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    await whenBothRoutesAnswer(
      { ...synthese, jours: synthese.jours?.slice(0, 6) ?? [] },
      { ...feuille, jours: feuille.jours?.slice(0, 6) ?? [] },
    );

    expect(await result).toEqual(new Error('Le relevé reçu du serveur ne couvre pas les sept jours de la semaine demandée.'));
  });

  it('should reject a duration the synthesis carries that cannot be read', async () => {
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    await whenBothRoutesAnswer({ ...toRestSynthese(semaineFixture()), dureePresumeeTotale: 'P1D' }, toRestFeuille(semaineFixture()));

    expect(await result).toEqual(new Error('La durée « P1D » reçue du serveur n’est pas une durée de travail.'));
  });

  it('should reject a presumed interval the time sheet leaves without an end', async () => {
    const feuille = toRestFeuille([
      { ...jourVideFixture, plages: [{ debut: '2026-09-14T08:20:00Z', presumee: true }] },
      ...semaineFixture().slice(1),
    ]);
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    await whenBothRoutesAnswer(toRestSynthese(semaineFixture()), feuille);

    expect(await result).toEqual(new Error('La plage reçue du serveur est présumée sans fin.'));
  });

  it.each([ROUTE_SYNTHESE, ROUTE_FEUILLE])(
    'should report a technical failure of %s once through the error handler and reject',
    async route => {
      const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
      await whenRouteFails(route, 500, {});
      await whenRouteAnswers(autreRoute(route), documentDe(autreRoute(route)));

      expect(await result).toBeInstanceOf(HttpErrorResponse);
      expect(errorHandler.errors).toHaveLength(1);
    },
  );

  it('should report a failure of both routes only once', async () => {
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    await whenRouteFails(ROUTE_FEUILLE, 500, {});
    await whenRouteFails(ROUTE_SYNTHESE, 503, {});

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should keep a 404 without a known code a technical failure', async () => {
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    await whenRouteFails(ROUTE_SYNTHESE, 404, {});
    await whenRouteAnswers(ROUTE_FEUILLE, toRestFeuille(semaineFixture()));

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it.each([
    [ROUTE_SYNTHESE, SYNTHESE_INTROUVABLE],
    [ROUTE_FEUILLE, FEUILLE_INTROUVABLE],
  ])('should answer nothing, and report nothing, for an operator %s does not know', async (route, urn) => {
    const result = port.synthese(DEMANDE);
    await whenRouteAnswers(autreRoute(route), documentDe(autreRoute(route)));
    await whenRouteFails(route, 404, { type: urn });

    expect(await result).toBeUndefined();
    expect(errorHandler.errors).toEqual([]);
  });

  it.each([
    [ROUTE_SYNTHESE, SYNTHESE_INTROUVABLE],
    [ROUTE_FEUILLE, FEUILLE_INTROUVABLE],
  ])('should answer nothing, and report nothing, for an operator %s does not know while the other route fails', async (route, urn) => {
    const result = port.synthese(DEMANDE);
    await whenRouteFails(autreRoute(route), 500, {});
    await whenRouteFails(route, 404, { type: urn });

    expect(await result).toBeUndefined();
    expect(errorHandler.errors).toEqual([]);
  });

  const autreRoute = (route: string): string => (route === ROUTE_SYNTHESE ? ROUTE_FEUILLE : ROUTE_SYNTHESE);

  const documentDe = (route: string): RestSynthese | RestFeuille =>
    route === ROUTE_SYNTHESE ? toRestSynthese(semaineFixture()) : toRestFeuille(semaineFixture());

  const requeteDe = async (route: string): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    return server.expectOne(candidate => candidate.method === 'GET' && candidate.url === `${route}/${OPERATEUR}`);
  };

  const whenRouteAnswers = async (route: string, body: RestSynthese | RestFeuille): Promise<TestRequest> => {
    const request = await requeteDe(route);
    request.flush(body);
    return request;
  };

  const whenBothRoutesAnswer = async (synthese: RestSynthese, feuille: RestFeuille): Promise<ReadonlyMap<string, TestRequest>> =>
    new Map([
      [ROUTE_SYNTHESE, await whenRouteAnswers(ROUTE_SYNTHESE, synthese)],
      [ROUTE_FEUILLE, await whenRouteAnswers(ROUTE_FEUILLE, feuille)],
    ]);

  const whenRouteFails = async (route: string, status: number, error: object): Promise<void> => {
    (await requeteDe(route)).flush(error, { status, statusText: 'Failure' });
  };
});
