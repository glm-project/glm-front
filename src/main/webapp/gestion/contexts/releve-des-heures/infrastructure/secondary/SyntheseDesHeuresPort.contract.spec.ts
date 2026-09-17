import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpResponse, provideHttpClient } from '@angular/common/http';
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
import { PointageDeReleve } from '../../domain/releve/PointageDeReleve';
import { ReleveDesHeures } from '../../domain/releve/ReleveDesHeures';
import { DemandeDeReleve, SyntheseDesHeuresPort } from '../../domain/releve/SyntheseDesHeuresPort';
import { JourCalendaire } from '../../domain/semaine/JourCalendaire';
import { SemaineISO } from '../../domain/semaine/SemaineISO';
import { HttpSyntheseDesHeures } from './HttpSyntheseDesHeures';

type RestSynthese = components['schemas']['RestSyntheseDesHeures'];
type RestJour = components['schemas']['RestJourDeSynthese'];

const ROUTE = '/api/syntheses-des-heures';
const OPERATEUR = 'op-1';
const OPERATEUR_INTROUVABLE = 'urn:glm:erreur:synthese-des-heures:operateur-introuvable';
const SEMAINE = new SemaineISO(2026, 38);
const DEMANDE = new DemandeDeReleve(new OperateurReleveId(OPERATEUR), SEMAINE);

interface PointageFixture {
  readonly type: 'ARRIVEE' | 'PAUSE' | 'REPRISE' | 'DEPART';
  readonly instant: string;
}

interface JourFixture {
  readonly duree: string;
  readonly pointages: readonly PointageFixture[];
}

const jourTravailleFixture: JourFixture = {
  duree: 'PT7H30M',
  pointages: [
    { type: 'ARRIVEE', instant: '2026-09-14T06:02:00Z' },
    { type: 'DEPART', instant: '2026-09-14T15:32:00Z' },
  ],
};

const jourVideFixture: JourFixture = { duree: 'PT0S', pointages: [] };

const semaineFixture = (): readonly JourFixture[] => [
  jourTravailleFixture,
  jourVideFixture,
  jourVideFixture,
  jourVideFixture,
  jourVideFixture,
  jourVideFixture,
  jourVideFixture,
];

interface ProjectionJour {
  readonly jour: string;
  readonly heures: number;
  readonly minutes: number;
  readonly pointages: readonly string[];
}

const projeterJour = (jour: JourDeReleve): ProjectionJour => ({
  jour: jour.jour.value,
  heures: jour.duree.heures,
  minutes: jour.duree.minutesRestantes,
  pointages: jour.pointages.map(pointage => `${pointage.type} ${pointage.instant.value.toISOString()}`),
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
  duree: jour.duree,
  pointages: jour.pointages.map(pointage => ({ type: pointage.type, dateDeSurvenue: pointage.instant })),
});

/** `exactOptionalPropertyTypes` interdit d'écraser un champ optionnel par `undefined` : on retire la clé. */
const sansChampDeSynthese = (synthese: RestSynthese, champ: keyof RestSynthese): RestSynthese =>
  Object.fromEntries(Object.entries(synthese).filter(([cle]) => cle !== champ)) as RestSynthese;

const sansChampDeJour = (jour: RestJour, champ: keyof RestJour): RestJour =>
  Object.fromEntries(Object.entries(jour).filter(([cle]) => cle !== champ)) as RestJour;

const joursDe = (synthese: RestSynthese): readonly RestJour[] => synthese.jours ?? [];

const premierJourDe = (synthese: RestSynthese): RestJour => {
  const jour = joursDe(synthese)[0];
  if (jour === undefined) {
    throw new Error('La synthèse de scénario ne porte aucun jour');
  }
  return jour;
};

const toRest = (jours: readonly JourFixture[]): RestSynthese => ({
  annee: SEMAINE.annee,
  semaine: SEMAINE.numero,
  dureeTotale: 'PT7H30M',
  operateur: { id: OPERATEUR, nom: 'Dupont', prenom: 'Jean' },
  jours: jours.map(toRestJour),
});

const toDomain = (jours: readonly JourFixture[]): ReleveDesHeures =>
  new ReleveDesHeures(SEMAINE, {
    operateur: new IdentiteOperateur('Dupont', 'Jean'),
    total: new DureeTravaillee('PT7H30M'),
    jours: jours.map(
      (jour, rang) =>
        new JourDeReleve(
          new JourCalendaire(jourDeLaSemaine(rang)),
          new DureeTravaillee(jour.duree),
          jour.pointages.map(pointage => new PointageDeReleve(pointage.type, new InstantDeReleve(pointage.instant))),
        ),
    ),
  });

class SyntheseHttpBackendFixture implements HttpBackend {
  jours: readonly JourFixture[] = [];
  operateurInconnu = false;

  /** La route ne porte aucun filtre qui changerait la réponse : ce double n'a pas besoin de la requête. */
  handle(): Observable<HttpEvent<unknown>> {
    return defer(() => this.answer()).pipe(
      switchMap(answer => (answer instanceof HttpErrorResponse ? throwError(() => answer) : of(answer))),
    );
  }

  private async answer(): Promise<HttpResponse<unknown> | HttpErrorResponse> {
    await new Promise(resolve => setTimeout(resolve));
    if (this.operateurInconnu) {
      return new HttpErrorResponse({ status: 404, statusText: 'Not Found', error: { type: OPERATEUR_INTROUVABLE } });
    }
    return new HttpResponse({ status: 200, body: toRest(this.jours) });
  }
}

interface SyntheseHarness {
  readonly port: SyntheseDesHeuresPort;
  seed(jours: readonly JourFixture[]): void;
  seedOperateurInconnu(): void;
}

const createHttpHarness = (): SyntheseHarness => {
  const backend = new SyntheseHttpBackendFixture();
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

  it('should return the worked time and the clockings of a worked day', async () => {
    givenSemaine(semaineFixture());

    const releve = await port.synthese(DEMANDE);

    expect(releve?.jours.map(projeterJour)[0]).toEqual({
      jour: '2026-09-14',
      heures: 7,
      minutes: 30,
      pointages: ['ARRIVEE 2026-09-14T06:02:00.000Z', 'DEPART 2026-09-14T15:32:00.000Z'],
    });
  });

  it('should return a day carrying no clocking as a day without clocking', async () => {
    givenSemaine(semaineFixture());

    const releve = await port.synthese(DEMANDE);

    expect(releve?.jours[1]?.estSansPointage()).toBe(true);
  });

  it('should return the week total the server computed', async () => {
    givenSemaine(semaineFixture());

    const releve = await port.synthese(DEMANDE);

    expect(releve?.total).toMatchObject({ heures: 7, minutesRestantes: 30 });
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

  it('should ask the server for the requested operator, year and week', async () => {
    const result = port.synthese(DEMANDE);
    const request = await whenServerAnswers(toRest(semaineFixture()));

    await result;
    expect(request.request.url).toBe(`${ROUTE}/${OPERATEUR}`);
    expect(request.request.params.get('annee')).toBe('2026');
    expect(request.request.params.get('semaine')).toBe('38');
  });

  it.each<keyof RestSynthese>(['annee', 'semaine', 'dureeTotale', 'operateur', 'jours'])(
    'should reject a server answer missing synthese.%s',
    async champ => {
      const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
      await whenServerAnswers(sansChampDeSynthese(toRest(semaineFixture()), champ));

      expect(await result).toEqual(new Error(`synthese.${champ} manque dans la réponse du serveur`));
    },
  );

  it.each<keyof RestJour>(['jour', 'duree', 'pointages'])('should reject a server answer missing jour.%s', async champ => {
    const synthese = toRest(semaineFixture());
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    await whenServerAnswers({ ...synthese, jours: [sansChampDeJour(premierJourDe(synthese), champ)] });

    expect(await result).toEqual(new Error(`jour.${champ} manque dans la réponse du serveur`));
  });

  it('should reject a week the server answered for another week', async () => {
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    await whenServerAnswers({ ...toRest(semaineFixture()), annee: 2026, semaine: 37 });

    expect(await result).toEqual(new Error('La semaine reçue du serveur n’est pas celle demandée.'));
  });

  it('should reject a week that does not carry seven days', async () => {
    const synthese = toRest(semaineFixture());
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    await whenServerAnswers({ ...synthese, jours: joursDe(synthese).slice(0, 6) });

    expect(await result).toEqual(new Error('Le relevé reçu du serveur ne couvre pas les sept jours de la semaine demandée.'));
  });

  it('should reject a duration the report cannot read', async () => {
    const synthese = toRest(semaineFixture());
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    await whenServerAnswers({ ...synthese, dureeTotale: 'P1D' });

    expect(await result).toEqual(new Error('La durée « P1D » reçue du serveur n’est pas une durée de travail.'));
  });

  it('should report a technical failure once through the error handler and reject', async () => {
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    await whenServerFails(500, {});

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should keep a 404 without a known code a technical failure', async () => {
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    await whenServerFails(404, {});

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should not report an operator the referential does not know', async () => {
    const result = port.synthese(DEMANDE);
    await whenServerFails(404, { type: OPERATEUR_INTROUVABLE });

    expect(await result).toBeUndefined();
    expect(errorHandler.errors).toEqual([]);
  });

  const whenServerAnswers = async (body: RestSynthese): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(candidate => candidate.method === 'GET' && candidate.url === `${ROUTE}/${OPERATEUR}`);
    request.flush(body);
    return request;
  };

  const whenServerFails = async (status: number, error: object): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server
      .expectOne(candidate => candidate.method === 'GET' && candidate.url === `${ROUTE}/${OPERATEUR}`)
      .flush(error, { status, statusText: 'Failure' });
  };
});
