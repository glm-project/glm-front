import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { ElementsEngageablesFixture } from '@test/unit/fixtures/gestion/atelier/ElementsEngageablesFixture';
import { defer, Observable, of, switchMap, throwError } from 'rxjs';
import { DesignationDElement } from '../../domain/DesignationDElement';
import { ElementEngageable } from '../../domain/ElementEngageable';
import { ElementEngageId } from '../../domain/ElementEngageId';
import { ElementsEngageablesPort } from '../../domain/ElementsEngageablesPort';
import { RequeteEngageables } from '../../domain/RequeteEngageables';
import { TypeDElementEngage } from '../../domain/TypeDElementEngage';
import { HttpElementsEngageables } from './HttpElementsEngageables';

type RestElement = components['schemas']['RestElementDeFabrication'];

const ROUTE = '/api/elements-de-fabrication';
const INTROUVABLE = 'urn:glm:erreur:element-de-fabrication:element-de-fabrication-introuvable';

interface EngageableFixture {
  readonly id: string;
  readonly nom: string;
  readonly type: TypeDElementEngage;
  readonly reference?: string;
}

const mouleFixture: EngageableFixture = { id: 'moule-1', nom: 'PRD-2026-000001', type: 'PRODUIT', reference: '1015' };
const ofSansReferenceFixture: EngageableFixture = { id: 'of-1', nom: 'OF-2026-000042', type: 'ORDRE_DE_FABRICATION' };

interface ProjectionEngageable {
  readonly id: string;
  readonly designation: string;
  readonly type: string;
}

const projeter = (element: ElementEngageable): ProjectionEngageable => ({
  id: element.id.value,
  designation: element.designation.value,
  type: element.type,
});

const toRest = (element: EngageableFixture): RestElement => ({
  id: element.id,
  nom: element.nom,
  type: element.type,
  ...(element.reference === undefined ? {} : { reference: element.reference }),
});

const toDomain = (element: EngageableFixture): ElementEngageable =>
  new ElementEngageable(new ElementEngageId(element.id), {
    designation: new DesignationDElement(element.reference, element.nom),
    type: element.type,
  });

class EngageablesHttpBackendFixture implements HttpBackend {
  elements: EngageableFixture[] = [];

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    return defer(() => this.answer(request)).pipe(
      switchMap(answer => (answer instanceof HttpErrorResponse ? throwError(() => answer) : of(answer))),
    );
  }

  private async answer(request: HttpRequest<unknown>): Promise<HttpResponse<unknown> | HttpErrorResponse> {
    await new Promise(resolve => setTimeout(resolve));
    const url = new URL(request.urlWithParams, 'http://localhost');
    if (url.pathname === ROUTE) {
      return this.handleList(url.searchParams);
    }
    return this.handleOne(url.pathname.substring(`${ROUTE}/`.length));
  }

  private handleList(searchParams: URLSearchParams): HttpResponse<unknown> {
    const page = Number(searchParams.get('page') ?? '0');
    const size = Number(searchParams.get('size') ?? '20');
    return new HttpResponse({
      status: 200,
      body: {
        content: this.elements.slice(page * size, (page + 1) * size).map(toRest),
        currentPage: page,
        pageSize: size,
        totalElementsCount: this.elements.length,
      },
    });
  }

  private handleOne(id: string): HttpResponse<unknown> | HttpErrorResponse {
    const element = this.elements.find(candidat => candidat.id === id);
    if (element === undefined) {
      return new HttpErrorResponse({ status: 404, statusText: 'Not Found', error: { type: INTROUVABLE } });
    }
    return new HttpResponse({ status: 200, body: toRest(element) });
  }
}

interface EngageablesHarness {
  readonly port: ElementsEngageablesPort;
  seed(elements: readonly EngageableFixture[]): void;
}

const createHttpHarness = (): EngageablesHarness => {
  const backend = new EngageablesHttpBackendFixture();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      { provide: HttpBackend, useValue: backend },
      ApiClient,
      { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      HttpElementsEngageables,
    ],
  });
  return {
    port: TestBed.inject(HttpElementsEngageables),
    seed: (elements: readonly EngageableFixture[]) => {
      backend.elements = [...elements];
    },
  };
};

const createFixtureHarness = (): EngageablesHarness => {
  const fixture = new ElementsEngageablesFixture();
  return {
    port: fixture,
    seed: (elements: readonly EngageableFixture[]) => {
      fixture.liste = elements.map(toDomain);
    },
  };
};

const adapters: [string, () => EngageablesHarness][] = [
  ['HttpElementsEngageables', createHttpHarness],
  ['ElementsEngageablesFixture', createFixtureHarness],
];

describe.each(adapters)('ElementsEngageablesPort contract, honoured by %s', (_adapter, createHarness) => {
  let harness: EngageablesHarness;
  let port: ElementsEngageablesPort;

  beforeEach(() => {
    harness = createHarness();
    port = harness.port;
  });

  it('should designate each element by its company number, falling back to its produced name', async () => {
    givenReferential([mouleFixture, ofSansReferenceFixture]);

    const page = await port.elements(new RequeteEngageables(0, 20));

    expect(page.totalCount).toBe(2);
    expect(page.elements.map(projeter)).toEqual([
      { id: 'moule-1', designation: '1015', type: 'PRODUIT' },
      { id: 'of-1', designation: 'OF-2026-000042', type: 'ORDRE_DE_FABRICATION' },
    ]);
  });

  it('should slice pages according to the requested page and size', async () => {
    givenManyElements(25);

    const page = await port.elements(new RequeteEngageables(1, 10));

    expect(page.totalCount).toBe(25);
    expect(page.elements).toHaveLength(10);
    expect(page.elements[0]?.id.value).toBe('e-10');
  });

  it('should return an empty page for an empty referential', async () => {
    givenReferential([]);

    const page = await port.elements(new RequeteEngageables(0, 20));

    expect(page.totalCount).toBe(0);
    expect(page.elements).toEqual([]);
  });

  it('should resolve a single element by its identifier', async () => {
    givenReferential([mouleFixture, ofSansReferenceFixture]);

    const element = await port.element(new ElementEngageId('of-1'));

    expect(element === undefined ? undefined : projeter(element)).toEqual({
      id: 'of-1',
      designation: 'OF-2026-000042',
      type: 'ORDRE_DE_FABRICATION',
    });
  });

  it('should answer nothing for an element the referential no longer holds', async () => {
    givenReferential([mouleFixture]);

    const element = await port.element(new ElementEngageId('disparu'));

    expect(element).toBeUndefined();
  });

  const givenReferential = (elements: readonly EngageableFixture[]): void => {
    harness.seed(elements);
  };

  const givenManyElements = (count: number): void => {
    harness.seed(
      Array.from({ length: count }, (_, index) => ({
        id: `e-${String(index)}`,
        nom: `PRD-2026-${String(index)}`,
        type: 'PRODUIT' as const,
      })),
    );
  };
});

describe('Beyond the contract: HttpElementsEngageables', () => {
  let port: ElementsEngageablesPort;
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
        HttpElementsEngageables,
      ],
    });
    port = TestBed.inject(HttpElementsEngageables);
    server = TestBed.inject(HttpTestingController);
    errorHandler = TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture;
  });

  afterEach(() => {
    server.verify();
  });

  it('should ask the server for the whole amplitude rather than a period the choice does not carry', async () => {
    const result = port.elements(new RequeteEngageables(0, 20));
    const request = await whenListAnswers([]);

    await result;
    expect(request.request.params.get('debut')).toBe('1970-01-01T00:00:00Z');
    expect(request.request.params.get('fin')).toBe('2999-12-31T23:59:59Z');
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('20');
  });

  it.each([
    ['element.id', { nom: 'PRD-2026-000001', type: 'PRODUIT' as const }],
    ['element.nom', { id: 'moule-1', type: 'PRODUIT' as const }],
    ['element.type', { id: 'moule-1', nom: 'PRD-2026-000001' }],
  ])('should reject a server answer missing %s', async (champ, element) => {
    const result = port.elements(new RequeteEngageables(0, 20)).catch((failure: unknown) => failure);
    await whenListAnswers([element]);

    expect(await result).toEqual(new Error(`${champ} manque dans la réponse du serveur`));
  });

  it('should report a technical list failure to ErrorHandlerPort and reject', async () => {
    const result = port.elements(new RequeteEngageables(0, 20)).catch((failure: unknown) => failure);
    await whenListFails(500);

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should report a technical single-read failure to ErrorHandlerPort and reject', async () => {
    const result = port.element(new ElementEngageId('moule-1')).catch((failure: unknown) => failure);
    await whenSingleAnswers(500, {});

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  const whenListAnswers = async (elements: readonly RestElement[]): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(candidate => candidate.method === 'GET' && candidate.url === ROUTE);
    request.flush({ content: elements, currentPage: 0, pageSize: 20, totalElementsCount: elements.length });
    return request;
  };

  const whenListFails = async (status: number): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server.expectOne(candidate => candidate.method === 'GET' && candidate.url === ROUTE).flush({}, { status, statusText: 'Failure' });
  };

  const whenSingleAnswers = async (status: number, body: object): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server.expectOne(`${ROUTE}/moule-1`).flush(body, { status, statusText: 'Failure' });
  };
});
