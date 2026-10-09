import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { PAGE_SIZE } from '@/app/shared/pagination/infrastructure/secondary/buildPageFrom';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { elementFixture, releveFixture } from '@test/unit/fixtures/gestion/releve-des-heures/ReleveDesHeuresFixture';
import { SyntheseDesHeuresFixture } from '@test/unit/fixtures/gestion/releve-des-heures/SyntheseDesHeuresFixture';
import { defer, Observable, of, switchMap, throwError } from 'rxjs';
import { vi } from 'vitest';
import { IdentiteOperateur } from '../../domain/releve/IdentiteOperateur';
import { OperateurDuReleve } from '../../domain/releve/OperateurDuReleve';
import { OperateurReleveId } from '../../domain/releve/OperateurReleveId';
import { ReleveDesHeures } from '../../domain/releve/ReleveDesHeures';
import { DemandeDeReleve, SyntheseDesHeuresPort } from '../../domain/releve/SyntheseDesHeuresPort';
import { SemaineISO } from '../../domain/semaine/SemaineISO';
import { HttpSyntheseDesHeures } from './HttpSyntheseDesHeures';

type RestSynthese = components['schemas']['RestSyntheseDesHeures'];
type RestFeuille = components['schemas']['RestFeuilleDeTemps'];
type RestActivite = components['schemas']['RestActiviteDeLaFeuilleDeTemps'];
const ROUTE_SYNTHESE = '/api/syntheses-des-heures';
const ROUTE_FEUILLE = '/api/feuilles-de-temps';
const OPERATEUR = 'op-1';
const SEMAINE = new SemaineISO(2026, 38);
const DEMANDE = new DemandeDeReleve(new OperateurReleveId(OPERATEUR), SEMAINE);
const SYNTHESE_INTROUVABLE = 'urn:glm:erreur:synthese-des-heures:operateur-introuvable';
const FEUILLE_INTROUVABLE = 'urn:glm:erreur:feuille-de-temps:operateur-introuvable';
const operateursPageFixture = (page: number, count: number, total: number): components['schemas']['PageRestOperateur'] => ({
  content: Array.from({ length: count }, (_, index) => ({
    id: `op-${String(page * PAGE_SIZE + index)}`,
    nom: `Nom ${String(page * PAGE_SIZE + index)}`,
    prenom: 'Prénom',
    postes: [],
    natures: [],
  })),
  currentPage: page,
  pageSize: PAGE_SIZE,
  totalElementsCount: total,
});

const EVALUATION = '2026-09-14T18:00:00Z';

const syntheseFixture = (): RestSynthese => ({
  annee: 2026,
  semaine: 38,
  operateur: { id: OPERATEUR, nom: 'Dupont', prenom: 'Jean' },
  evaluation: EVALUATION,
  dureeOperationnelleTotale: { valeur: 'PT57H30M' },
  elements: [
    {
      id: 'element-1',
      categorie: 'MOULE',
      nom: 'Moule',
      reference: '1015',
      description: 'Carter',
      duree: { valeur: 'PT15H30M' },
      dureeNonConformite: { valeur: 'PT50M' },
      postes: [{ poste: { id: 'poste-1', libelle: 'DMU 50' }, nature: 'Fraisage' }],
    },
  ],
  jours: SEMAINE.jours().map((jour, rang) => ({
    jour: jour.value,
    dureeOperationnelle: { valeur: rang === 0 ? 'PT2H' : 'PT0S' },
    pointages:
      rang === 0
        ? [
            {
              id: 'debut-a',
              type: 'DEBUT',
              dateDeSurvenue: '2026-09-14T08:00:00Z',
              element: 'element-1',
              poste: 'poste-1',
            },
          ]
        : [],
  })),
});

const activiteTermineeFixture = (): RestActivite => ({
  element: 'element-1',
  poste: 'poste-1',
  nature: 'Fraisage',
  categorie: 'TRAVAIL',
  debut: '2026-09-14T08:00:00Z',
  fin: '2026-09-14T10:00:00Z',
  activite: { id: 'debut-a', debut: '2026-09-14T08:00:00Z', fin: '2026-09-14T10:00:00Z', etat: 'TERMINEE' },
});

const feuilleFixture = (): RestFeuille => ({
  annee: 2026,
  semaine: 38,
  operateur: { id: OPERATEUR, nom: 'Dupont', prenom: 'Jean' },
  evaluation: EVALUATION,
  jours: SEMAINE.jours().map((jour, rang) => ({ jour: jour.value, activites: rang === 0 ? [activiteTermineeFixture()] : [] })),
});

const domaineFixture = (): ReleveDesHeures =>
  releveFixture(
    SEMAINE,
    {
      0: {
        operationnelle: 'PT2H',
        pointagesDElement: [{ id: 'debut-a', type: 'DEBUT', heure: [8, 0], poste: 'poste-1' }],
        intervalles: [{ debut: [8, 0], fin: [10, 0], poste: 'poste-1' }],
      },
    },
    { operationnelle: 'PT57H30M' },
    [
      elementFixture({
        reference: '1015',
        description: 'Carter',
        duree: 'PT15H30M',
        dureeNonConformite: 'PT50M',
        postes: [['DMU 50', 'Fraisage', 'poste-1']],
      }),
    ],
  );

class ReleveHttpBackendFixture implements HttpBackend {
  operateurs: readonly OperateurDuReleve[] = [];
  operateursFailure = false;
  operateurInconnu = false;
  synthese = syntheseFixture();
  feuille = feuilleFixture();

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    return defer(() => this.answer(request)).pipe(
      switchMap(answer => (answer instanceof HttpErrorResponse ? throwError(() => answer) : of(answer))),
    );
  }

  private async answer(request: HttpRequest<unknown>): Promise<HttpResponse<unknown> | HttpErrorResponse> {
    await new Promise(resolve => setTimeout(resolve));
    if (request.url === '/api/operateurs') {
      if (this.operateursFailure) {
        return new HttpErrorResponse({ status: 500 });
      }
      return new HttpResponse({
        body: {
          content: this.operateurs.map(operateur => ({
            id: operateur.id.value,
            nom: operateur.identite.nom,
            prenom: operateur.identite.prenom,
            postes: [],
            natures: [],
          })),
          currentPage: 0,
          pageSize: 100,
          totalElementsCount: this.operateurs.length,
        },
      });
    }
    const feuille = request.url.startsWith(ROUTE_FEUILLE);
    if (this.operateurInconnu) {
      return new HttpErrorResponse({ status: 404, error: { type: feuille ? FEUILLE_INTROUVABLE : SYNTHESE_INTROUVABLE } });
    }
    return new HttpResponse({
      status: 200,
      body: { ...(feuille ? this.feuille : this.synthese), evaluation: request.params.get('evaluation') },
    });
  }
}

interface SyntheseHarness {
  readonly port: SyntheseDesHeuresPort;
  seedOperateursFailure(): void;
  seedOperateurs(operateurs: readonly OperateurDuReleve[]): void;
  seedOperateurInconnu(): void;
  seed(releve: ReleveDesHeures, synthese: RestSynthese, feuille: RestFeuille): void;
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
    seedOperateursFailure: () => {
      backend.operateursFailure = true;
    },
    seedOperateurs: operateurs => {
      backend.operateurs = operateurs;
      backend.operateursFailure = false;
    },
    seed: (_releve, synthese, feuille) => {
      backend.synthese = synthese;
      backend.feuille = feuille;
    },
    seedOperateurInconnu: () => {
      backend.operateurInconnu = true;
    },
  };
};

const createFixtureHarness = (): SyntheseHarness => {
  const fixture = new SyntheseDesHeuresFixture();
  fixture.releves.set(`${OPERATEUR}|2026|38`, domaineFixture());
  return {
    port: fixture,
    seedOperateursFailure: () => {
      fixture.operateursFailure = new Error('Indisponible');
    },
    seedOperateurs: operateurs => {
      fixture.identites = operateurs;
      fixture.operateursFailure = undefined;
    },
    seed: releve => {
      fixture.releves.set(`${OPERATEUR}|2026|38`, releve);
    },
    seedOperateurInconnu: () => {
      fixture.operateursInconnus.add(OPERATEUR);
    },
  };
};

const adapters: readonly (readonly [string, () => SyntheseHarness])[] = [
  ['HttpSyntheseDesHeures', createHttpHarness],
  ['SyntheseDesHeuresFixture', createFixtureHarness],
];

describe.each(adapters)('SyntheseDesHeuresPort contract, honoured by %s', (_adapter, createHarness) => {
  let harness: SyntheseHarness;
  beforeEach(() => {
    harness = createHarness();
  });

  it('should return an empty collection when no operator is available', async () => {
    const operateurs = await harness.port.operateurs();

    expect(operateurs).toEqual([]);
  });

  it('should return all available operator identities using report identifiers', async () => {
    harness.seedOperateurs([
      { id: new OperateurReleveId('op-1'), identite: new IdentiteOperateur('Dupont', 'Jean') },
      { id: new OperateurReleveId('op-2'), identite: new IdentiteOperateur('Évrard', 'Zoé') },
    ]);

    const operateurs = await harness.port.operateurs();

    expect(operateurs).toEqual([
      { id: new OperateurReleveId('op-1'), identite: new IdentiteOperateur('Dupont', 'Jean') },
      { id: new OperateurReleveId('op-2'), identite: new IdentiteOperateur('Évrard', 'Zoé') },
    ]);
  });

  it('should reject an unavailable collection instead of returning a partial choice', async () => {
    harness.seedOperateursFailure();

    const lecture = harness.port.operateurs();

    await expect(lecture).rejects.toHaveProperty('message');
  });

  it('should retry a failed operator collection with a complete new acquisition', async () => {
    harness.seedOperateursFailure();

    const result = await whenRetryingOperatorCollection();

    expect(result.failure.status).toBe('rejected');
    expect(result.operateurs).toEqual([{ id: new OperateurReleveId('nouveau'), identite: new IdentiteOperateur('Nouveau', 'Lucie') }]);
  });

  const whenRetryingOperatorCollection = async () => {
    const [failure] = await Promise.allSettled([harness.port.operateurs()]);
    harness.seedOperateurs([{ id: new OperateurReleveId('nouveau'), identite: new IdentiteOperateur('Nouveau', 'Lucie') }]);
    const operateurs = await harness.port.operateurs();
    return { failure: requiredFixture(failure), operateurs };
  };

  it('should return the seven days of the week in calendar order and the resolved operator', async () => {
    const releve = await harness.port.synthese(DEMANDE);

    expect(releve?.jours.map(jour => jour.jour.value)).toEqual([
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
      '2026-09-20',
    ]);
    expect(releve?.operateur).toMatchObject({ nom: 'Dupont', prenom: 'Jean' });
  });

  it('should transport the week total without adding the day totals', async () => {
    const releve = await harness.port.synthese(DEMANDE);

    expect(releve?.operationnelTotal).toMatchObject({ minutes: 3450 });
    expect(releve?.jours[0]?.operationnelTotal).toMatchObject({ minutes: 120 });
  });

  it('should transport element totals and their independent nonconformity', async () => {
    const releve = await harness.port.synthese(DEMANDE);

    expect(releve?.elements[0]?.duree).toMatchObject({ minutes: 930 });
    expect(releve?.elements[0]?.dureeNonConformite).toMatchObject({ minutes: 50 });
    expect(releve?.elements[0]?.numero()).toBe('1015');
    expect(releve?.elements[0]?.postes[0]?.libelle).toBe('DMU 50');
  });

  it('should retain clocking identity in the journal', async () => {
    const releve = await harness.port.synthese(DEMANDE);

    expect(releve?.jours[0]?.pointages[0]).toMatchObject({ id: { value: 'debut-a' }, type: 'DEBUT' });
    expect(releve?.jours[1]?.estVide()).toBe(true);
  });

  it('should preserve the received journal order and the element of each clocking', async () => {
    const synthese = syntheseFixture();
    const pointages: components['schemas']['RestPointageDeSyntheseDesHeures'][] = [
      { id: 'fin-a', type: 'FIN', element: 'element-1', dateDeSurvenue: '2026-09-14T17:00:00Z' },
      {
        id: 'nc-b',
        type: 'NON_CONFORMITE',
        element: 'element-1',
        dateDeSurvenue: '2026-09-14T12:00:00Z',
      },
    ];
    harness.seed(
      releveFixture(SEMAINE, {
        0: {
          pointagesDElement: [
            { id: 'fin-a', type: 'FIN', heure: [17, 0] },
            { id: 'nc-b', type: 'NON_CONFORMITE', heure: [12, 0] },
          ],
        },
      }),
      { ...synthese, jours: requiredFixture(synthese.jours).map((jour, rang) => (rang === 0 ? { ...jour, pointages } : jour)) },
      feuilleFixture(),
    );

    const releve = await harness.port.synthese(DEMANDE);

    expect(releve?.jours[0]?.pointages.map(pointage => [pointage.id.value, pointage.type, pointage.cible.element.value])).toEqual([
      ['fin-a', 'FIN', 'element-1'],
      ['nc-b', 'NON_CONFORMITE', 'element-1'],
    ]);
  });

  it('should answer nothing for an unknown operator', async () => {
    harness.seedOperateurInconnu();

    const releve = await harness.port.synthese(DEMANDE);

    expect(releve).toBeUndefined();
  });
});

const requiredFixture = <T>(value: T | undefined): T => {
  if (value === undefined) {
    throw new Error('Required scenario fixture is missing');
  }
  return value;
};

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
    vi.useRealTimers();
  });

  it.each([ROUTE_SYNTHESE, ROUTE_FEUILLE])('should ask %s for the requested operator and ISO week', async route => {
    const result = port.synthese(DEMANDE);
    const requests = whenBothRoutesAnswer(syntheseFixture(), feuilleFixture());

    await result;

    expect([requests.get(route)?.request.params.get('annee'), requests.get(route)?.request.params.get('semaine')]).toEqual(['2026', '38']);
  });

  it.each([ROUTE_SYNTHESE, ROUTE_FEUILLE])('should reject an evaluation echo of %s belonging to another acquisition', async route => {
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    whenRouteAnswers(route, documentDe(route), '2000-01-01T00:00:00Z');
    whenRouteAnswers(autreRoute(route), documentDe(autreRoute(route)));

    expect(await result).toBeInstanceOf(Error);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should report a failed operator acquisition only once', async () => {
    const lecture = port.operateurs();
    whenOperatorCollectionFails();

    await expect(lecture).rejects.toHaveProperty('status', 500);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should acquire operators beyond the first full page without a workstation filter', async () => {
    const pages = [operateursPageFixture(0, PAGE_SIZE, PAGE_SIZE + 1), operateursPageFixture(1, 1, PAGE_SIZE + 1)];

    const lecture = await whenReadingOperatorPages(pages);

    expect(lecture.map(operateur => operateur.id.value)).toHaveLength(PAGE_SIZE + 1);
    expect(lecture.at(-1)).toEqual({ id: new OperateurReleveId('op-100'), identite: new IdentiteOperateur('Nom 100', 'Prénom') });
  });

  it('should reject an unexpected operator page number and report it once', async () => {
    const lecture = whenReadingOperatorPages([operateursPageFixture(1, 0, 0)]);

    await expect(lecture).rejects.toThrow();
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should reject duplicated operator identities instead of publishing an ambiguous collection', async () => {
    const page = operateursPageFixture(0, 2, 2);
    page.content = [requiredFixture(page.content[0]), requiredFixture(page.content[0])];

    const lecture = whenReadingOperatorPages([page]);

    await expect(lecture).rejects.toThrow();
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should reject operator totals that change during acquisition', async () => {
    const pages = [operateursPageFixture(0, PAGE_SIZE, PAGE_SIZE + 1), operateursPageFixture(1, 1, PAGE_SIZE)];

    const lecture = whenReadingOperatorPages(pages);

    await expect(lecture).rejects.toThrow();
    expect(errorHandler.errors).toHaveLength(1);
  });

  it.each([
    [0, 1],
    [1, 2],
    [2, 1],
  ])('should reject a truncated or oversized operator page with %s entries for %s expected', async (count, total) => {
    const lecture = whenReadingOperatorPages([operateursPageFixture(0, count, total)]);

    await expect(lecture).rejects.toThrow();
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should reject a page served with a different operator page size', async () => {
    const page = { ...operateursPageFixture(0, 1, 1), pageSize: 50 };

    const lecture = whenReadingOperatorPages([page]);

    await expect(lecture).rejects.toThrow();
    expect(errorHandler.errors).toHaveLength(1);
  });

  it.each([
    [PAGE_SIZE, Number.POSITIVE_INFINITY],
    [0, -1],
    [1, 1.5],
    [0, Number.NaN],
    [PAGE_SIZE, Number.MAX_SAFE_INTEGER + 1],
  ])('should reject an invalid operator total for %s entries and total %s', async (count, total) => {
    const lecture = whenReadingOperatorPages([operateursPageFixture(0, count, total)]);

    await expect(lecture).rejects.toThrow();
    expect(errorHandler.errors).toHaveLength(1);
  });

  const whenReadingOperatorPages = async (
    pages: readonly components['schemas']['PageRestOperateur'][],
  ): Promise<readonly OperateurDuReleve[]> => {
    const lecture = port.operateurs();
    for (const [numero, page] of pages.entries()) {
      const request = givenOperateursRequest();
      expect(request.request.params.get('page')).toBe(String(numero));
      expect(request.request.params.get('size')).toBe(String(PAGE_SIZE));
      expect(request.request.params.get('poste')).toBeNull();
      request.flush(page);
      await Promise.resolve();
    }
    return lecture;
  };

  const whenOperatorCollectionFails = (): void => {
    givenOperateursRequest().flush({}, { status: 500, statusText: 'Unavailable' });
  };

  const givenOperateursRequest = (): TestRequest => server.expectOne(request => request.url === '/api/operateurs');

  it('should start both reads with one evaluation even when their answers cross the deadline', async () => {
    givenEvaluationAt('2026-09-14T12:59:59.999Z');
    const result = port.synthese(DEMANDE);
    const synthese = requeteDe(ROUTE_SYNTHESE);
    const feuille = requeteDe(ROUTE_FEUILLE);
    whenClockAdvancesTo('2026-09-14T13:00:00.001Z');
    whenRequestAnswers(synthese, syntheseFixture());
    whenRequestAnswers(feuille, feuilleFixture());
    await result;

    expect([synthese.request.params.get('evaluation'), feuille.request.params.get('evaluation')]).toEqual([
      '2026-09-14T12:59:59.999Z',
      '2026-09-14T12:59:59.999Z',
    ]);
  });

  it('should accept an echo with another ISO spelling of the same instant', async () => {
    givenEvaluationAt('2026-09-14T11:00:00Z');
    const result = port.synthese(DEMANDE);
    whenRouteAnswers(ROUTE_SYNTHESE, syntheseFixture(), '2026-09-14T13:00:00+02:00');
    whenRouteAnswers(ROUTE_FEUILLE, feuilleFixture(), '2026-09-14T11:00:00.000Z');

    expect(await result).toBeInstanceOf(ReleveDesHeures);
    expect(errorHandler.errors).toEqual([]);
  });

  it.each([ROUTE_SYNTHESE, ROUTE_FEUILLE])('should reject a 400 evaluation refusal of %s once', async route => {
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    whenRouteFails(route, 400, {});
    whenRouteAnswers(autreRoute(route), documentDe(autreRoute(route)));

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it.each([ROUTE_SYNTHESE, ROUTE_FEUILLE])('should report a technical failure of %s once', async route => {
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    whenRouteFails(route, 500, {});
    whenRouteAnswers(autreRoute(route), documentDe(autreRoute(route)));

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should report a failure of both sources only once', async () => {
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    whenRouteFails(ROUTE_FEUILLE, 500, {});
    whenRouteFails(ROUTE_SYNTHESE, 503, {});

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should keep a 404 without a known code a technical failure', async () => {
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    whenRouteFails(ROUTE_SYNTHESE, 404, {});
    whenRouteAnswers(ROUTE_FEUILLE, feuilleFixture());

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it.each([
    [ROUTE_SYNTHESE, SYNTHESE_INTROUVABLE],
    [ROUTE_FEUILLE, FEUILLE_INTROUVABLE],
  ])('should keep the unknown operator of %s ahead of a source failure', async (route, urn) => {
    const result = port.synthese(DEMANDE);
    whenRouteFails(autreRoute(route), 500, {});
    whenRouteFails(route, 404, { type: urn });

    expect(await result).toBeUndefined();
    expect(errorHandler.errors).toEqual([]);
  });

  it.each([
    ['TERMINEE_AUTOMATIQUEMENT', '2026-09-14T11:00:00Z', 'PT11H', 660],
    ['EN_COURS', undefined, 'PT0S', 0],
  ] as const)('should translate the origin state %s and its effective end without manufacturing one', async (etat, fin, duree, minutes) => {
    const source = { ...sansChamp(activiteTermineeFixture(), 'poste'), debut: '2026-09-14T00:00:00Z' };
    const feuille = feuilleFixture();
    const synthese = syntheseFixture();
    const result = port.synthese(DEMANDE);
    whenBothRoutesAnswer(
      { ...synthese, dureeOperationnelleTotale: { valeur: duree } },
      {
        ...feuille,
        jours: requiredFixture(feuille.jours).map((jour, rang) =>
          rang === 0
            ? {
                ...jour,
                activites: [
                  {
                    ...withoutEnd(source),
                    ...(fin === undefined ? {} : { fin }),
                    activite: {
                      id: 'origine-hors-journal',
                      debut: '2026-09-13T22:00:00Z',
                      etat,
                      ...(fin === undefined ? {} : { fin }),
                    },
                  },
                ],
              }
            : jour,
        ),
      },
    );

    const releve = await result;

    expect(releve?.jours[0]?.intervalles[0]?.activite).toMatchObject({
      id: { value: 'origine-hors-journal' },
      debut: { value: new Date('2026-09-13T22:00:00Z') },
      etat,
    });
    expect(releve?.jours[0]?.intervalles[0]?.poste).toBeUndefined();
    expect(releve?.jours[0]?.intervalles[0]?.fin?.value.toISOString()).toBe(fin === undefined ? undefined : '2026-09-14T11:00:00.000Z');
    expect(releve?.operationnelTotal).toMatchObject({ minutes });
  });

  it('should attach time sheet portions by date even when its days are returned in reverse order', async () => {
    const feuille = feuilleFixture();
    const result = port.synthese(DEMANDE);
    whenBothRoutesAnswer(syntheseFixture(), { ...feuille, jours: [...requiredFixture(feuille.jours)].reverse() });

    expect((await result)?.jours.map(jour => jour.intervalles.length)).toEqual([1, 0, 0, 0, 0, 0, 0]);
  });

  it.each(['another day', 'fewer days', 'duplicate day', 'extra duplicate day'])(
    'should reject a time sheet carrying %s once',
    async cas => {
      const feuille = feuilleFixture();
      const jours = requiredFixture(feuille.jours);
      const retouche = joursRetouches(cas, jours);
      const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
      whenBothRoutesAnswer(syntheseFixture(), { ...feuille, jours: retouche });

      expect(await result).toEqual(new Error('La feuille de temps reçue du serveur ne porte pas les jours de la synthèse.'));
      expect(errorHandler.errors).toHaveLength(1);
    },
  );

  it.each([ROUTE_SYNTHESE, ROUTE_FEUILLE])('should reject another week returned by %s once', async route => {
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    whenRouteAnswers(route, { ...documentDe(route), semaine: 37 });
    whenRouteAnswers(autreRoute(route), documentDe(autreRoute(route)));

    expect(await result).toEqual(new Error('La semaine reçue du serveur n’est pas celle demandée.'));
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should reject an unreadable complete duration once', async () => {
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    whenBothRoutesAnswer({ ...syntheseFixture(), dureeOperationnelleTotale: { valeur: 'P1D' } }, feuilleFixture());

    expect(await result).toEqual(new Error('La durée « P1D » reçue du serveur n’est pas une durée de travail.'));
    expect(errorHandler.errors).toHaveLength(1);
  });

  it.each(['annee', 'semaine', 'operateur', 'jours'] as const)('should reject a reading missing synthese.%s', async champ => {
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    whenBothRoutesAnswer(sansChamp(syntheseFixture(), champ), feuilleFixture());

    expect(await result).toEqual(new Error(`synthese.${champ} manque dans la réponse du serveur`));
    expect(errorHandler.errors).toHaveLength(1);
  });

  it.each(['annee', 'semaine', 'jours'] as const)('should reject a reading missing feuille.%s', async champ => {
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    whenBothRoutesAnswer(syntheseFixture(), sansChamp(feuilleFixture(), champ));

    expect(await result).toEqual(new Error(`feuille.${champ} manque dans la réponse du serveur`));
    expect(errorHandler.errors).toHaveLength(1);
  });

  it.each(['jour', 'pointages'] as const)('should reject a reading missing jour.%s', async champ => {
    const synthese = syntheseFixture();
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    whenBothRoutesAnswer(
      { ...synthese, jours: requiredFixture(synthese.jours).map((jour, rang) => (rang === 0 ? sansChamp(jour, champ) : jour)) },
      feuilleFixture(),
    );

    expect(await result).toEqual(new Error(`jour.${champ} manque dans la réponse du serveur`));
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should reject a time sheet missing a day identity', async () => {
    const feuille = feuilleFixture();
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    whenBothRoutesAnswer(syntheseFixture(), {
      ...feuille,
      jours: requiredFixture(feuille.jours).map((jour, rang) => (rang === 0 ? sansChamp(jour, 'jour') : jour)),
    });

    expect(await result).toEqual(new Error('jourDeLaFeuille.jour manque dans la réponse du serveur'));
    expect(errorHandler.errors).toHaveLength(1);
  });

  it.each(['TERMINEE', 'TERMINEE_AUTOMATIQUEMENT'] as const)('should reject a closed origin %s without its effective end', async etat => {
    const feuille = feuilleFixture();
    const source = activiteTermineeFixture();
    const result = port.synthese(DEMANDE).catch((failure: unknown) => failure);
    whenBothRoutesAnswer(syntheseFixture(), {
      ...feuille,
      jours: requiredFixture(feuille.jours).map((jour, rang) =>
        rang === 0 ? { ...jour, activites: [{ ...source, activite: { id: 'a', debut: source.debut, etat } }] } : jour,
      ),
    });

    expect(await result).toEqual(new Error('activite.fin manque dans la réponse du serveur'));
    expect(errorHandler.errors).toHaveLength(1);
  });

  const givenEvaluationAt = (instant: string): void => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(instant));
  };
  const whenClockAdvancesTo = (instant: string): void => {
    vi.setSystemTime(new Date(instant));
  };
  const joursRetouches = (cas: string, jours: NonNullable<RestFeuille['jours']>): NonNullable<RestFeuille['jours']> => {
    switch (cas) {
      case 'another day':
        return [...jours.slice(0, 6), { jour: '2026-09-21', activites: [] }];
      case 'fewer days':
        return jours.slice(0, 6);
      case 'duplicate day':
        return [...jours.slice(0, 6), requiredFixture(jours[0])];
      default:
        return [...jours, requiredFixture(jours[0])];
    }
  };
  const sansChamp = <T extends object>(objet: T, champ: keyof T): T => {
    const copie = { ...objet };
    Reflect.deleteProperty(copie, champ);
    return copie;
  };
  const withoutEnd = (source: RestActivite): RestActivite => sansChamp(source, 'fin');
  const autreRoute = (route: string): string => (route === ROUTE_SYNTHESE ? ROUTE_FEUILLE : ROUTE_SYNTHESE);
  const documentDe = (route: string): RestSynthese | RestFeuille => (route === ROUTE_SYNTHESE ? syntheseFixture() : feuilleFixture());
  const requeteDe = (route: string): TestRequest =>
    server.expectOne(candidate => candidate.method === 'GET' && candidate.url === `${route}/${OPERATEUR}`);
  const whenRequestAnswers = (request: TestRequest, body: RestSynthese | RestFeuille, evaluation?: string): TestRequest => {
    request.flush({ ...body, evaluation: evaluation ?? request.request.params.get('evaluation') });
    return request;
  };
  const whenRouteAnswers = (route: string, body: RestSynthese | RestFeuille, evaluation?: string): TestRequest =>
    whenRequestAnswers(requeteDe(route), body, evaluation);
  const whenBothRoutesAnswer = (synthese: RestSynthese, feuille: RestFeuille): ReadonlyMap<string, TestRequest> =>
    new Map([
      [ROUTE_SYNTHESE, whenRouteAnswers(ROUTE_SYNTHESE, synthese)],
      [ROUTE_FEUILLE, whenRouteAnswers(ROUTE_FEUILLE, feuille)],
    ]);
  const whenRouteFails = (route: string, status: number, error: object): void => {
    requeteDe(route).flush(error, { status, statusText: 'Failure' });
  };
});
