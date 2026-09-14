import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { Result } from '@/app/shared/result/domain/Result';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { PostesFixture } from '@test/unit/fixtures/gestion/poste/PostesFixture';
import { defer, Observable, of, switchMap, throwError } from 'rxjs';
import { CoutHoraire } from '../../domain/CoutHoraire';
import { LibellePoste } from '../../domain/LibellePoste';
import { LibellePosteDejaUtilise } from '../../domain/LibellePosteDejaUtilise';
import { NatureDeTravail } from '../../domain/NatureDeTravail';
import { PosteDeTravail } from '../../domain/PosteDeTravail';
import { PosteDeTravailId } from '../../domain/PosteDeTravailId';
import { PosteIntrouvable } from '../../domain/PosteIntrouvable';
import { PosteNonSupprimable } from '../../domain/PosteNonSupprimable';
import { PostesPort } from '../../domain/PostesPort';
import { RefusModificationPoste } from '../../domain/RefusModificationPoste';
import { RefusSuppressionPoste } from '../../domain/RefusSuppressionPoste';
import { RequetePostes } from '../../domain/RequetePostes';
import { HttpPostes } from './HttpPostes';

type RestPoste = components['schemas']['RestPosteDeTravail'];

const tourFixture: RestPoste = { id: 'tour-1', libelle: 'Tour 1', nature: 'tournage', coutHoraire: 45.5 };
const scieFixture: RestPoste = { id: 'scie-1', libelle: 'Scie 1', nature: 'sciage' };

class PostesHttpBackendFixture implements HttpBackend {
  postes: RestPoste[] = [];

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    return defer(() => this.answer(request)).pipe(
      switchMap(answer => (answer instanceof HttpErrorResponse ? throwError(() => answer) : of(answer))),
    );
  }

  private async answer(request: HttpRequest<unknown>): Promise<HttpResponse<unknown> | HttpErrorResponse> {
    await new Promise(resolve => setTimeout(resolve));
    const url = new URL(request.urlWithParams, 'http://localhost');
    const pathname = url.pathname;

    switch (request.method) {
      case 'GET':
        return this.handleGet(pathname, url.searchParams);
      case 'POST':
        return this.handlePost(pathname, request.body as { libelle: string; nature: string; coutHoraire?: number });
      case 'PUT':
        return this.handlePut(pathname, request.body as { libelle: string; nature: string; coutHoraire?: number });
      case 'DELETE':
        return this.handleDelete(pathname);
      default:
        return new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    }
  }

  private handleGet(pathname: string, searchParams: URLSearchParams): HttpResponse<unknown> | HttpErrorResponse {
    if (pathname !== '/api/postes-de-travail') {
      return new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    }
    const page = Number(searchParams.get('page') ?? '0');
    const size = Number(searchParams.get('size') ?? '20');
    const content = this.postes.slice(page * size, (page + 1) * size);
    return new HttpResponse({
      status: 200,
      body: { content, currentPage: page, pageSize: size, totalElementsCount: this.postes.length },
    });
  }

  private handlePost(
    pathname: string,
    body: { libelle: string; nature: string; coutHoraire?: number },
  ): HttpResponse<unknown> | HttpErrorResponse {
    if (pathname !== '/api/postes-de-travail') {
      return new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    }
    const created: RestPoste = {
      id: 'created-poste',
      libelle: body.libelle,
      nature: body.nature,
      ...(body.coutHoraire !== undefined ? { coutHoraire: body.coutHoraire } : {}),
    };
    this.postes = [...this.postes, created];
    return new HttpResponse({ status: 201, body: created });
  }

  private handlePut(
    pathname: string,
    body: { libelle: string; nature: string; coutHoraire?: number },
  ): HttpResponse<unknown> | HttpErrorResponse {
    if (!pathname.startsWith('/api/postes-de-travail/')) {
      return new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    }
    const id = pathname.substring('/api/postes-de-travail/'.length);
    this.postes = this.postes.map(p =>
      p.id === id
        ? {
            id,
            libelle: body.libelle,
            nature: body.nature,
            ...(body.coutHoraire !== undefined ? { coutHoraire: body.coutHoraire } : {}),
          }
        : p,
    );
    const updated = this.postes.find(p => p.id === id);
    return new HttpResponse({ status: 200, body: updated });
  }

  private handleDelete(pathname: string): HttpResponse<unknown> | HttpErrorResponse {
    if (!pathname.startsWith('/api/postes-de-travail/')) {
      return new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    }
    const id = pathname.substring('/api/postes-de-travail/'.length);
    this.postes = this.postes.filter(p => p.id !== id);
    return new HttpResponse({ status: 204, body: null });
  }
}

interface PostesHarness {
  readonly port: PostesPort;
  seed(postes: readonly RestPoste[]): void;
}

const createHttpHarness = (): PostesHarness => {
  const backend = new PostesHttpBackendFixture();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      { provide: HttpBackend, useValue: backend },
      ApiClient,
      { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      HttpPostes,
    ],
  });
  const port = TestBed.inject(HttpPostes);
  return {
    port,
    seed: (postes: readonly RestPoste[]) => {
      backend.postes = [...postes];
    },
  };
};

const createFixtureHarness = (): PostesHarness => {
  const fixture = new PostesFixture();
  return {
    port: fixture,
    seed: (postes: readonly RestPoste[]) => {
      fixture.liste = postes.map(
        poste =>
          new PosteDeTravail(new PosteDeTravailId(poste.id), {
            libelle: new LibellePoste(poste.libelle),
            nature: new NatureDeTravail(poste.nature),
            coutHoraire: poste.coutHoraire !== undefined ? new CoutHoraire(poste.coutHoraire) : undefined,
          }),
      );
    },
  };
};

const adapters: [string, () => PostesHarness][] = [
  ['HttpPostes', createHttpHarness],
  ['PostesFixture', createFixtureHarness],
];

describe.each(adapters)('PostesPort contract, honoured by %s', (_adapter, createHarness) => {
  let harness: PostesHarness;
  let port: PostesPort;

  beforeEach(() => {
    harness = createHarness();
    port = harness.port;
  });

  it('should return the requested page with domain values and the total count', async () => {
    givenWorkstations([tourFixture, scieFixture]);

    const page = await whenQueryingPage(0, 10);

    thenPageMatches(page, 2, [
      { id: 'tour-1', libelle: 'Tour 1', nature: 'tournage', coutHoraire: 45.5 },
      { id: 'scie-1', libelle: 'Scie 1', nature: 'sciage' },
    ]);
  });

  it('should slice pages according to the requested page and size', async () => {
    givenManyWorkstations(25);

    const page = await whenQueryingPage(1, 10);

    thenPageSliceMatches(page, 25, 10, 'p-10', 'p-19');
  });

  it('should return an empty page for an empty workshop', async () => {
    givenWorkstations([]);

    const page = await whenQueryingPage(0, 20);

    thenPageMatches(page, 0, []);
  });

  it('should return distinct suggestions in French alphabetical order', async () => {
    givenWorkstations([
      { id: '1', libelle: 'Poste 1', nature: 'tournage' },
      { id: '2', libelle: 'Poste 2', nature: 'sciage' },
      { id: '3', libelle: 'Poste 3', nature: 'Tournage' },
      { id: '4', libelle: 'Poste 4', nature: 'ébavurage' },
    ]);

    await whenQueryingNatures();
    const natures = await whenQueryingNatures();

    thenNaturesAre(natures, ['ébavurage', 'sciage', 'tournage']);
  });

  it('should include a nature beyond the first hundred workstations and deduplicate across pages', async () => {
    givenWorkstations([
      ...Array.from({ length: 100 }, (_, index) => ({ id: `p-${index}`, libelle: `Poste ${index}`, nature: 'tournage' })),
      { id: 'p-100', libelle: 'Poste 100', nature: 'Tournage' },
      { id: 'p-101', libelle: 'Poste 101', nature: 'soudage' },
    ]);

    const natures = await whenQueryingNatures();

    thenNaturesAre(natures, ['soudage', 'tournage']);
  });

  it('should return no suggested natures for an empty workshop', async () => {
    givenWorkstations([]);

    const natures = await whenQueryingNatures();

    thenNaturesAre(natures, []);
  });

  it('should create a workstation with hourly cost and reflect it in queries', async () => {
    givenWorkstations([scieFixture]);
    await whenQueryingNatures();
    const resultat = await whenCreatingWorkstation('Tour 1', 'tournage', 45.5);

    thenCommandSucceeded(resultat);
    await thenWorkstationExists('Tour 1', 'tournage', 45.5, ['sciage', 'tournage']);
  });

  it('should create a workstation without hourly cost and reflect it in queries', async () => {
    await whenQueryingNatures();
    const resultat = await whenCreatingWorkstation('Scie 1', 'sciage');

    thenCommandSucceeded(resultat);
    await thenWorkstationExists('Scie 1', 'sciage');
  });

  it('should update an existing workstation and reflect changes in queries', async () => {
    givenWorkstations([tourFixture]);

    await whenQueryingNatures();
    const resultat = await whenModifyingWorkstation('tour-1', 'Tour 1 Modifié', 'fraisage', 52);

    thenCommandSucceeded(resultat);
    await thenWorkstationExists('Tour 1 Modifié', 'fraisage', 52);
  });

  it('should remove a workstation and reflect its absence in queries', async () => {
    givenWorkstations([tourFixture]);

    await whenQueryingNatures();
    const resultat = await whenDeletingWorkstation('tour-1');
    const natures = await whenQueryingNatures();

    thenCommandSucceeded(resultat);
    await thenWorkstationDoesNotExist('tour-1');
    thenNaturesAre(natures, []);
  });

  const givenWorkstations = (postes: readonly RestPoste[]): void => {
    harness.seed(postes);
  };

  const givenManyWorkstations = (count: number): void => {
    const postes: RestPoste[] = Array.from({ length: count }, (_, index) => ({
      id: `p-${index}`,
      libelle: `Poste ${index}`,
      nature: 'fraisage',
    }));
    harness.seed(postes);
  };

  const whenQueryingPage = (page: number, size: number): Promise<Page<PosteDeTravail>> => port.postes(new RequetePostes(page, size));

  const whenQueryingNatures = (): Promise<readonly NatureDeTravail[]> => port.natures();

  const whenCreatingWorkstation = (libelle: string, nature: string, coutHoraire?: number): Promise<Result<void, LibellePosteDejaUtilise>> =>
    port.creer({
      type: 'CREATION',
      libelle: new LibellePoste(libelle),
      nature: new NatureDeTravail(nature),
      coutHoraire: coutHoraire !== undefined ? new CoutHoraire(coutHoraire) : undefined,
    });

  const whenModifyingWorkstation = (
    id: string,
    libelle: string,
    nature: string,
    coutHoraire?: number,
  ): Promise<Result<void, RefusModificationPoste>> =>
    port.modifier({
      type: 'MODIFICATION',
      id: new PosteDeTravailId(id),
      libelle: new LibellePoste(libelle),
      nature: new NatureDeTravail(nature),
      coutHoraire: coutHoraire !== undefined ? new CoutHoraire(coutHoraire) : undefined,
    });

  const whenDeletingWorkstation = (id: string): Promise<Result<void, RefusSuppressionPoste>> => port.supprimer(new PosteDeTravailId(id));

  const thenCommandSucceeded = (resultat: Result<void, unknown>): void => {
    expect(resultat).toEqual({ ok: true, value: undefined });
  };

  const thenPageMatches = (
    page: Page<PosteDeTravail>,
    total: number,
    expected: readonly { id: string; libelle: string; nature: string; coutHoraire?: number }[],
  ): void => {
    expect(page.totalCount).toBe(total);
    expect(
      page.elements.map(poste => ({
        id: poste.id.value,
        libelle: poste.libelle.value,
        nature: poste.nature.value,
        ...(poste.coutHoraire !== undefined ? { coutHoraire: poste.coutHoraire.value } : {}),
      })),
    ).toEqual(expected);
  };

  const thenPageSliceMatches = (page: Page<PosteDeTravail>, total: number, count: number, firstId: string, lastId: string): void => {
    expect(page.totalCount).toBe(total);
    expect(page.elements).toHaveLength(count);
    expect(page.elements[0]?.id.value).toBe(firstId);
    expect(page.elements[count - 1]?.id.value).toBe(lastId);
  };

  const thenNaturesAre = (natures: readonly NatureDeTravail[], expected: string[]): void => {
    expect(natures).toEqual(expected.map(nature => new NatureDeTravail(nature)));
  };

  const thenWorkstationExists = async (
    libelle: string,
    nature: string,
    coutHoraire?: number,
    expectedNatures: string[] = [nature],
  ): Promise<void> => {
    const page = await port.postes(new RequetePostes(0, 20));
    const matching = page.elements.find(poste => poste.libelle.value === libelle);
    expect(matching).toBeDefined();
    expect(matching?.nature.value).toBe(nature);
    expect(matching?.coutHoraire?.value).toBe(coutHoraire);

    const natures = await port.natures();
    expect(natures.map(value => value.value)).toEqual(expectedNatures);
  };

  const thenWorkstationDoesNotExist = async (id: string): Promise<void> => {
    const page = await port.postes(new RequetePostes(0, 20));
    expect(page.elements.some(poste => poste.id.value === id)).toBe(false);
  };
});

describe('Beyond the contract: HttpPostes', () => {
  let port: PostesPort;
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
        HttpPostes,
      ],
    });
    port = TestBed.inject(HttpPostes);
    server = TestBed.inject(HttpTestingController);
    errorHandler = TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture;
  });

  afterEach(() => {
    server.verify();
  });

  it('should reject incomplete nature acquisition when the server stops providing entries', async () => {
    const result = port.natures().catch((failure: unknown) => failure);
    await whenReferentialAnswers([], 1);

    expect(await result).toEqual(new Error('Le référentiel des natures est incomplet.'));
    expect(errorHandler.errors).toHaveLength(1);
    expect(errorHandler.errors[0]).toEqual(new Error('Le référentiel des natures est incomplet.'));
  });

  it('should reject a failed later page without retaining partial suggestions and allow retry', async () => {
    const result = port.natures().catch((failure: unknown) => failure);
    await whenFirstNaturePageAnswers();
    await whenServerFails('/api/postes-de-travail?page=1&size=100', 500);
    const failure = await result;
    const retry = port.natures();
    await whenReferentialAnswers([
      ...Array.from({ length: 100 }, (_, index) => ({ id: `p-${index}`, libelle: `Poste ${index}`, nature: 'tournage' })),
      { id: 'p-100', libelle: 'Poste 100', nature: 'soudage' },
    ]);

    expect(failure).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toEqual([failure]);
    expect((await retry).map(nature => nature.value)).toEqual(['soudage', 'tournage']);
  });

  it('should report a technical read failure to ErrorHandlerPort and reject', async () => {
    const result = port.postes(new RequetePostes(0, 20)).catch((failure: unknown) => failure);
    await whenServerFails('/api/postes-de-travail?page=0&size=20', 500);

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
    expect(errorHandler.errors[0]).toBeInstanceOf(HttpErrorResponse);
  });

  it.each([
    ['creer', '/api/postes-de-travail', 409, 'libelle-deja-utilise', new LibellePosteDejaUtilise()],
    ['modifier', '/api/postes-de-travail/tour-1', 409, 'libelle-deja-utilise', new LibellePosteDejaUtilise()],
    ['modifier', '/api/postes-de-travail/tour-1', 404, 'poste-de-travail-introuvable', new PosteIntrouvable()],
    ['supprimer', '/api/postes-de-travail/tour-1', 404, 'poste-de-travail-introuvable', new PosteIntrouvable()],
    ['supprimer', '/api/postes-de-travail/tour-1', 409, 'poste-de-travail-pointe', new PosteNonSupprimable()],
    ['supprimer', '/api/postes-de-travail/tour-1', 409, 'poste-de-travail-utilise', new PosteNonSupprimable()],
  ] as const)('should translate the %s refusal %s into the domain', async (action, url, status, code, refus) => {
    const result = whenCommandStarts(action);
    await whenWriteAnswers(url, status, { type: 'urn:glm:erreur:poste-de-travail:' + code });

    expect(await result).toEqual({ ok: false, error: refus });
  });

  it.each([
    ['creer', '/api/postes-de-travail'],
    ['modifier', '/api/postes-de-travail/tour-1'],
    ['supprimer', '/api/postes-de-travail/tour-1'],
  ] as const)('should reject an unknown business code during %s', async (action, url) => {
    const result = whenCommandStarts(action).catch((failure: unknown) => failure);
    await whenWriteAnswers(url, 409, { type: 'urn:glm:erreur:poste-de-travail:inconnu' });

    expect(await result).toBeInstanceOf(HttpErrorResponse);
  });

  it.each([
    ['creer', '/api/postes-de-travail'],
    ['modifier', '/api/postes-de-travail/tour-1'],
    ['supprimer', '/api/postes-de-travail/tour-1'],
  ] as const)('should reject a technical failure during %s', async (action, url) => {
    const result = whenCommandStarts(action).catch((failure: unknown) => failure);
    await whenWriteAnswers(url, 500, {});

    expect(await result).toBeInstanceOf(HttpErrorResponse);
  });

  it.each([
    ['creer', 'POST', '/api/postes-de-travail', 201, { libelle: 'Tour 1', nature: 'tournage', coutHoraire: 45.5 }],
    ['creer sans cout', 'POST', '/api/postes-de-travail', 201, { libelle: 'Tour 1', nature: 'tournage' }],
    ['modifier', 'PUT', '/api/postes-de-travail/tour-1', 200, { libelle: 'Tour 1', nature: 'tournage', coutHoraire: 45.5 }],
    ['modifier sans cout', 'PUT', '/api/postes-de-travail/tour-1', 200, { libelle: 'Tour 1', nature: 'tournage' }],
  ] as const)('should serialize %s with method %s and expected payload', async (scenario, method, url, status, payload) => {
    const result = whenIssuingWrite(scenario);
    const request = await whenWriteAnswers(url, status, payload);
    await result;

    thenMethodMatches(request, method);
    thenPayloadMatches(request, payload);
  });

  it('should issue a DELETE request when deleting a workstation', async () => {
    const result = whenDeletingWorkstationById('tour-1');
    const request = await whenWriteAnswers('/api/postes-de-travail/tour-1', 204, null);
    await result;

    thenMethodMatches(request, 'DELETE');
  });

  const whenIssuingWrite = (scenario: 'creer' | 'creer sans cout' | 'modifier' | 'modifier sans cout'): Promise<Result<void, unknown>> => {
    switch (scenario) {
      case 'creer':
        return port.creer({
          type: 'CREATION',
          libelle: new LibellePoste('Tour 1'),
          nature: new NatureDeTravail('tournage'),
          coutHoraire: new CoutHoraire(45.5),
        });
      case 'creer sans cout':
        return port.creer({
          type: 'CREATION',
          libelle: new LibellePoste('Tour 1'),
          nature: new NatureDeTravail('tournage'),
          coutHoraire: undefined,
        });
      case 'modifier':
        return port.modifier({
          type: 'MODIFICATION',
          id: new PosteDeTravailId('tour-1'),
          libelle: new LibellePoste('Tour 1'),
          nature: new NatureDeTravail('tournage'),
          coutHoraire: new CoutHoraire(45.5),
        });
      case 'modifier sans cout':
        return port.modifier({
          type: 'MODIFICATION',
          id: new PosteDeTravailId('tour-1'),
          libelle: new LibellePoste('Tour 1'),
          nature: new NatureDeTravail('tournage'),
          coutHoraire: undefined,
        });
    }
  };

  const whenDeletingWorkstationById = (id: string): Promise<Result<void, unknown>> => port.supprimer(new PosteDeTravailId(id));

  const thenMethodMatches = (request: TestRequest, method: string): void => {
    expect(request.request.method).toBe(method);
  };

  const thenPayloadMatches = (request: TestRequest, payload: object): void => {
    expect(request.request.body).toEqual(payload);
  };

  const whenCommandStarts = (action: 'creer' | 'modifier' | 'supprimer') => {
    switch (action) {
      case 'creer':
        return port.creer({
          type: 'CREATION',
          libelle: new LibellePoste('Tour 1'),
          nature: new NatureDeTravail('tournage'),
          coutHoraire: undefined,
        });
      case 'modifier':
        return port.modifier({
          type: 'MODIFICATION',
          id: new PosteDeTravailId('tour-1'),
          libelle: new LibellePoste('Tour 1'),
          nature: new NatureDeTravail('tournage'),
          coutHoraire: undefined,
        });
      case 'supprimer':
        return port.supprimer(new PosteDeTravailId('tour-1'));
    }
  };

  const whenWriteAnswers = async (url: string, status: number, body: object | null): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(url);
    request.flush(body, { status, statusText: 'Response' });
    return request;
  };

  const whenFirstNaturePageAnswers = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne('/api/postes-de-travail?page=0&size=100');
    request.flush({
      content: Array.from({ length: 100 }, (_, index) => ({ id: `p-${index}`, libelle: `Poste ${index}`, nature: 'tournage' })),
      currentPage: 0,
      pageSize: 100,
      totalElementsCount: 101,
    });
  };

  const whenReferentialAnswers = async (postes: RestPoste[], totalElementsCount = postes.length): Promise<void> => {
    let end: number;
    do {
      await new Promise(resolve => setTimeout(resolve));
      const request = server.expectOne(req => req.method === 'GET' && req.url === '/api/postes-de-travail');
      const page = Number(request.request.params.get('page'));
      const size = Number(request.request.params.get('size'));
      end = (page + 1) * size;
      request.flush({ content: postes.slice(page * size, end), currentPage: page, pageSize: size, totalElementsCount });
    } while (end < totalElementsCount);
  };

  const whenServerFails = async (url: string, status: number, body: object = {}): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server.expectOne(url).flush(body, { status, statusText: 'Failure' });
  };
});
