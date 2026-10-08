import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { CategoriesDeProduitFixture } from '@test/unit/fixtures/gestion/element-de-fabrication/CategoriesDeProduitFixture';
import { defer, Observable, of, switchMap, throwError } from 'rxjs';
import { CategorieDejaExistante } from '../../domain/CategorieDejaExistante';
import { CategorieDeProduit } from '../../domain/CategorieDeProduit';
import { CategoriesDeProduitPort } from '../../domain/CategoriesDeProduitPort';
import { HttpCategoriesDeProduit } from './HttpCategoriesDeProduit';

const ROUTE = '/api/categories-de-produit';
const URN = 'urn:glm:erreur:categorie-de-produit:';

class CategoriesHttpBackendFixture implements HttpBackend {
  codes: string[] = [];

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    return defer(() => this.answer(request)).pipe(
      switchMap(answer => (answer instanceof HttpErrorResponse ? throwError(() => answer) : of(answer))),
    );
  }

  private async answer(request: HttpRequest<unknown>): Promise<HttpResponse<unknown> | HttpErrorResponse> {
    await new Promise(resolve => setTimeout(resolve));
    const url = new URL(request.urlWithParams, 'http://localhost');
    if (url.pathname !== ROUTE) {
      return new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    }
    return request.method === 'POST' ? this.declare(request.body as { code: string }) : this.list(url.searchParams);
  }

  private list(searchParams: URLSearchParams): HttpResponse<unknown> {
    const page = Number(searchParams.get('page') ?? '0');
    const size = Number(searchParams.get('size') ?? '20');
    return new HttpResponse({
      status: 200,
      body: {
        content: this.codes.slice(page * size, (page + 1) * size).map(code => ({ code })),
        currentPage: page,
        pageSize: size,
        totalElementsCount: this.codes.length,
      },
    });
  }

  private declare(body: { code: string }): HttpResponse<unknown> | HttpErrorResponse {
    if (this.codes.includes(body.code)) {
      return new HttpErrorResponse({ status: 409, statusText: 'Conflict', error: { type: `${URN}categorie-deja-existante` } });
    }
    this.codes = [...this.codes, body.code];
    return new HttpResponse({ status: 201, body: { code: body.code } });
  }
}

interface CategoriesHarness {
  readonly port: CategoriesDeProduitPort;
  declare(codes: readonly string[]): void;
}

const createHttpHarness = (): CategoriesHarness => {
  const backend = new CategoriesHttpBackendFixture();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      { provide: HttpBackend, useValue: backend },
      ApiClient,
      { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      HttpCategoriesDeProduit,
    ],
  });
  return {
    port: TestBed.inject(HttpCategoriesDeProduit),
    declare: codes => {
      backend.codes = [...codes];
    },
  };
};

const createFixtureHarness = (): CategoriesHarness => {
  const fixture = new CategoriesDeProduitFixture();
  return {
    port: fixture,
    declare: codes => {
      fixture.liste = codes.map(code => new CategorieDeProduit(code));
    },
  };
};

const adapters: [string, () => CategoriesHarness][] = [
  ['HttpCategoriesDeProduit', createHttpHarness],
  ['CategoriesDeProduitFixture', createFixtureHarness],
];

describe.each(adapters)('CategoriesDeProduitPort contract, honoured by %s', (_adapter, createHarness) => {
  let harness: CategoriesHarness;

  beforeEach(() => {
    harness = createHarness();
  });

  it('should list the categories in the order the company chose', async () => {
    harness.declare(['OF', 'MOULE', 'PIECE']);

    const categories = await harness.port.categories();

    expect(categories.map(categorie => categorie.value)).toEqual(['OF', 'MOULE', 'PIECE']);
  });

  it('should declare a new category after the existing ones', async () => {
    harness.declare(['MOULE']);

    const resultat = await harness.port.declarer(new CategorieDeProduit('PIECE'));

    expect(resultat).toEqual({ ok: true, value: undefined });
    expect((await harness.port.categories()).map(categorie => categorie.value)).toEqual(['MOULE', 'PIECE']);
  });

  it('should refuse a category that already exists', async () => {
    harness.declare(['MOULE']);

    const resultat = await harness.port.declarer(new CategorieDeProduit('MOULE'));

    expect(resultat).toEqual({ ok: false, error: new CategorieDejaExistante() });
  });
});

describe('Beyond the contract: HttpCategoriesDeProduit', () => {
  let port: HttpCategoriesDeProduit;
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
        HttpCategoriesDeProduit,
      ],
    });
    port = TestBed.inject(HttpCategoriesDeProduit);
    server = TestBed.inject(HttpTestingController);
    errorHandler = TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture;
  });

  afterEach(() => {
    server.verify();
  });

  it('should report a technical read failure once and reject', async () => {
    const result = port.categories().catch((failure: unknown) => failure);
    await whenServerAnswers(500, {});

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should keep an unknown refusal of a declaration as a technical failure', async () => {
    const result = port.declarer(new CategorieDeProduit('PIECE')).catch((failure: unknown) => failure);
    await whenServerAnswers(409, { type: `${URN}inconnu` });

    expect(await result).toBeInstanceOf(HttpErrorResponse);
  });

  it('should send the code alone', async () => {
    const result = port.declarer(new CategorieDeProduit('PIECE'));
    const request = await whenServerAnswers(201, { code: 'PIECE' });

    await result;
    expect(request.request.body).toEqual({ code: 'PIECE' });
  });

  const whenServerAnswers = async (status: number, body: object): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(candidate => candidate.url === ROUTE);
    request.flush(body, { status, statusText: 'Response' });
    return request;
  };
});
