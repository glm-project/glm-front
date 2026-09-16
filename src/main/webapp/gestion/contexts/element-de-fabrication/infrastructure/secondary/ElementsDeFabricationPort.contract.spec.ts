import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { Result } from '@/app/shared/result/domain/Result';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { ElementsDeFabricationFixture } from '@test/unit/fixtures/gestion/element-de-fabrication/ElementsDeFabricationFixture';
import { defer, Observable, of, switchMap, throwError } from 'rxjs';
import { ElementDeFabrication } from '../../domain/ElementDeFabrication';
import { ElementDeFabricationId } from '../../domain/ElementDeFabricationId';
import { ElementDeFabricationIntrouvable } from '../../domain/ElementDeFabricationIntrouvable';
import { ElementsDeFabricationPort } from '../../domain/ElementsDeFabricationPort';
import { LibelleDElement } from '../../domain/LibelleDElement';
import { NomDElement } from '../../domain/NomDElement';
import { ReferenceDElement } from '../../domain/ReferenceDElement';
import { ReferenceDejaUtilisee } from '../../domain/ReferenceDejaUtilisee';
import { RefusModificationElement } from '../../domain/RefusModificationElement';
import { RequeteElements } from '../../domain/RequeteElements';
import { HttpElementsDeFabrication } from './HttpElementsDeFabrication';

type RestElement = components['schemas']['RestElementDeFabrication'];
interface CorpsDeFiche {
  reference?: string;
  description?: string;
}

interface ElementFixture {
  readonly id: string;
  readonly type: NonNullable<RestElement['type']>;
  readonly nom: string;
  readonly reference?: string;
  readonly description?: string;
}

const ROUTE = '/api/elements-de-fabrication';
const NOM_ATTRIBUE = 'PRD-2026-000001';

const mouleFixture: ElementFixture = {
  id: 'moule-1',
  type: 'PRODUIT',
  nom: 'PRD-2026-000001',
  reference: '1015',
  description: 'Moule de capot',
};
const ofSansReferenceFixture: ElementFixture = { id: 'of-1', type: 'ORDRE_DE_FABRICATION', nom: 'OF-2026-000042' };

interface ProjectionElement {
  readonly id: string;
  readonly type: string;
  readonly nom: string;
  readonly reference: string | undefined;
  readonly libelle: string | undefined;
}

const projeter = (element: ElementDeFabrication): ProjectionElement => ({
  id: element.id.value,
  type: element.type,
  nom: element.nom.value,
  reference: element.reference?.value,
  libelle: element.libelle?.value,
});

class ElementsHttpBackendFixture implements HttpBackend {
  elements: ElementFixture[] = [];

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    return defer(() => this.answer(request)).pipe(
      switchMap(answer => (answer instanceof HttpErrorResponse ? throwError(() => answer) : of(answer))),
    );
  }

  private async answer(request: HttpRequest<unknown>): Promise<HttpResponse<unknown> | HttpErrorResponse> {
    await new Promise(resolve => setTimeout(resolve));
    const url = new URL(request.urlWithParams, 'http://localhost');

    switch (request.method) {
      case 'GET':
        return this.handleGet(url.pathname, url.searchParams);
      case 'POST':
        return this.handlePost(url.pathname, request.body as CorpsDeFiche & { type: ElementFixture['type'] });
      case 'PUT':
        return this.handlePut(url.pathname, request.body as CorpsDeFiche);
      default:
        return new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    }
  }

  private handleGet(pathname: string, searchParams: URLSearchParams): HttpResponse<unknown> | HttpErrorResponse {
    if (pathname !== ROUTE) {
      return new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    }
    const page = Number(searchParams.get('page') ?? '0');
    const size = Number(searchParams.get('size') ?? '20');
    return new HttpResponse({
      status: 200,
      body: {
        content: this.elements.slice(page * size, (page + 1) * size),
        currentPage: page,
        pageSize: size,
        totalElementsCount: this.elements.length,
      },
    });
  }

  private handlePost(pathname: string, body: CorpsDeFiche & { type: ElementFixture['type'] }): HttpResponse<unknown> | HttpErrorResponse {
    if (pathname !== ROUTE) {
      return new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    }
    const created: ElementFixture = { id: 'created-element', type: body.type, nom: NOM_ATTRIBUE, ...ficheOf(body) };
    this.elements = [...this.elements, created];
    return new HttpResponse({ status: 201, body: created });
  }

  private handlePut(pathname: string, body: CorpsDeFiche): HttpResponse<unknown> | HttpErrorResponse {
    if (!pathname.startsWith(`${ROUTE}/`)) {
      return new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    }
    const id = pathname.substring(`${ROUTE}/`.length);
    this.elements = this.elements.map(element =>
      element.id === id ? { id, type: element.type, nom: element.nom, ...ficheOf(body) } : element,
    );
    return new HttpResponse({ status: 200, body: this.elements.find(element => element.id === id) });
  }
}

const ficheOf = (body: CorpsDeFiche): CorpsDeFiche => ({
  ...(body.reference === undefined ? {} : { reference: body.reference }),
  ...(body.description === undefined ? {} : { description: body.description }),
});

interface ElementsHarness {
  readonly port: ElementsDeFabricationPort;
  seed(elements: readonly ElementFixture[]): void;
}

const createHttpHarness = (): ElementsHarness => {
  const backend = new ElementsHttpBackendFixture();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      { provide: HttpBackend, useValue: backend },
      ApiClient,
      { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      HttpElementsDeFabrication,
    ],
  });
  return {
    port: TestBed.inject(HttpElementsDeFabrication),
    seed: (elements: readonly ElementFixture[]) => {
      backend.elements = [...elements];
    },
  };
};

const toDomain = (element: ElementFixture): ElementDeFabrication =>
  new ElementDeFabrication(new ElementDeFabricationId(element.id), {
    type: element.type,
    nom: new NomDElement(element.nom),
    reference: element.reference === undefined ? undefined : new ReferenceDElement(element.reference),
    libelle: element.description === undefined ? undefined : new LibelleDElement(element.description),
  });

const createFixtureHarness = (): ElementsHarness => {
  const fixture = new ElementsDeFabricationFixture();
  return {
    port: fixture,
    seed: (elements: readonly ElementFixture[]) => {
      fixture.liste = elements.map(toDomain);
    },
  };
};

const adapters: [string, () => ElementsHarness][] = [
  ['HttpElementsDeFabrication', createHttpHarness],
  ['ElementsDeFabricationFixture', createFixtureHarness],
];

describe.each(adapters)('ElementsDeFabricationPort contract, honoured by %s', (_adapter, createHarness) => {
  let harness: ElementsHarness;
  let port: ElementsDeFabricationPort;

  beforeEach(() => {
    harness = createHarness();
    port = harness.port;
  });

  it('should return the requested page with domain values and the total count', async () => {
    givenReferential([mouleFixture, ofSansReferenceFixture]);

    const page = await whenQueryingPage(0, 10);

    expect(page.totalCount).toBe(2);
    expect(page.elements.map(projeter)).toEqual([
      { id: 'moule-1', type: 'PRODUIT', nom: 'PRD-2026-000001', reference: '1015', libelle: 'Moule de capot' },
      { id: 'of-1', type: 'ORDRE_DE_FABRICATION', nom: 'OF-2026-000042', reference: undefined, libelle: undefined },
    ]);
  });

  it('should slice pages according to the requested page and size', async () => {
    givenManyElements(25);

    const page = await whenQueryingPage(1, 10);

    expect(page.totalCount).toBe(25);
    expect(page.elements).toHaveLength(10);
    expect(page.elements[0]?.id.value).toBe('e-10');
    expect(page.elements[9]?.id.value).toBe('e-19');
  });

  it('should return an empty page for an empty referential', async () => {
    givenReferential([]);

    const page = await whenQueryingPage(0, 20);

    expect(page.totalCount).toBe(0);
    expect(page.elements).toEqual([]);
  });

  it.each([
    ['with a company number and a label', '1015', 'Moule de capot'],
    ['reduced to its produced number', undefined, undefined],
  ] as const)('should create an element %s and list it', async (_scenario, reference, libelle) => {
    const resultat = await whenCreating('PRODUIT', reference, libelle);

    expect(resultat).toEqual({ ok: true, value: undefined });
    expect(await whenListing()).toEqual([{ id: 'created-element', type: 'PRODUIT', nom: NOM_ATTRIBUE, reference, libelle }]);
  });

  it('should create an ordre de fabrication carrying its own type', async () => {
    const resultat = await whenCreating('ORDRE_DE_FABRICATION', '1016', undefined);

    expect(resultat).toEqual({ ok: true, value: undefined });
    expect(await whenListing()).toEqual([
      { id: 'created-element', type: 'ORDRE_DE_FABRICATION', nom: NOM_ATTRIBUE, reference: '1016', libelle: undefined },
    ]);
  });

  it('should update the company number and the label of an existing element', async () => {
    givenReferential([mouleFixture]);

    const resultat = await whenModifying('moule-1', '1016', 'Moule de portière');

    expect(resultat).toEqual({ ok: true, value: undefined });
    expect(await whenListing()).toEqual([
      { id: 'moule-1', type: 'PRODUIT', nom: 'PRD-2026-000001', reference: '1016', libelle: 'Moule de portière' },
    ]);
  });

  it('should remove the company number and the label of an existing element', async () => {
    givenReferential([mouleFixture]);

    const resultat = await whenModifying('moule-1', undefined, undefined);

    expect(resultat).toEqual({ ok: true, value: undefined });
    expect(await whenListing()).toEqual([
      { id: 'moule-1', type: 'PRODUIT', nom: 'PRD-2026-000001', reference: undefined, libelle: undefined },
    ]);
  });

  const givenReferential = (elements: readonly ElementFixture[]): void => {
    harness.seed(elements);
  };

  const givenManyElements = (count: number): void => {
    harness.seed(
      Array.from({ length: count }, (_, index) => ({
        id: `e-${index}`,
        type: 'PRODUIT' as const,
        nom: `PRD-2026-${String(index).padStart(6, '0')}`,
      })),
    );
  };

  const whenQueryingPage = (page: number, taille: number): Promise<Page<ElementDeFabrication>> =>
    port.elements(new RequeteElements(page, taille));

  const whenListing = async (): Promise<ProjectionElement[]> => {
    const page = await port.elements(new RequeteElements(0, 20));
    return page.elements.map(projeter);
  };

  const whenCreating = (
    type: 'PRODUIT' | 'ORDRE_DE_FABRICATION',
    reference: string | undefined,
    libelle: string | undefined,
  ): Promise<Result<void, ReferenceDejaUtilisee>> =>
    port.creer({
      kind: 'CREATION',
      type,
      reference: reference === undefined ? undefined : new ReferenceDElement(reference),
      libelle: libelle === undefined ? undefined : new LibelleDElement(libelle),
    });

  const whenModifying = (
    id: string,
    reference: string | undefined,
    libelle: string | undefined,
  ): Promise<Result<void, RefusModificationElement>> =>
    port.modifier({
      kind: 'MODIFICATION',
      id: new ElementDeFabricationId(id),
      reference: reference === undefined ? undefined : new ReferenceDElement(reference),
      libelle: libelle === undefined ? undefined : new LibelleDElement(libelle),
    });
});

describe('Beyond the contract: HttpElementsDeFabrication', () => {
  let port: ElementsDeFabricationPort;
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
        HttpElementsDeFabrication,
      ],
    });
    port = TestBed.inject(HttpElementsDeFabrication);
    server = TestBed.inject(HttpTestingController);
    errorHandler = TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture;
  });

  afterEach(() => {
    server.verify();
  });

  it('should ask the server for the whole amplitude rather than a period the screen does not carry', async () => {
    const result = port.elements(new RequeteElements(0, 20));
    const request = await whenReadAnswers([]);

    await result;
    expect(request.request.params.get('debut')).toBe('1970-01-01T00:00:00Z');
    expect(request.request.params.get('fin')).toBe('2999-12-31T23:59:59Z');
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('20');
  });

  it('should report a technical read failure to ErrorHandlerPort and reject', async () => {
    const result = port.elements(new RequeteElements(0, 20)).catch((failure: unknown) => failure);
    await whenReadFails();

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
    expect(errorHandler.errors[0]).toBeInstanceOf(HttpErrorResponse);
  });

  it.each([
    ['element.id', { type: 'PRODUIT' as const, nom: NOM_ATTRIBUE }],
    ['element.nom', { id: 'moule-1', type: 'PRODUIT' as const }],
    ['element.type', { id: 'moule-1', nom: NOM_ATTRIBUE }],
  ])('should reject a server answer missing %s', async (champ, element) => {
    const result = port.elements(new RequeteElements(0, 20)).catch((failure: unknown) => failure);
    await whenReadAnswers([element]);

    expect(await result).toEqual(new Error(`${champ} manque dans la réponse du serveur`));
  });

  it.each([
    ['creer', ROUTE, 409, 'reference-deja-utilisee', new ReferenceDejaUtilisee()],
    ['modifier', `${ROUTE}/moule-1`, 409, 'reference-deja-utilisee', new ReferenceDejaUtilisee()],
    ['modifier', `${ROUTE}/moule-1`, 404, 'element-de-fabrication-introuvable', new ElementDeFabricationIntrouvable()],
  ] as const)('should translate the %s refusal into the domain', async (action, url, status, code, refus) => {
    const result = whenCommandStarts(action);
    await whenWriteAnswers(url, status, { type: `urn:glm:erreur:element-de-fabrication:${code}` });

    expect(await result).toEqual({ ok: false, error: refus });
  });

  it('should keep a creation refusal unknown to creation a technical failure', async () => {
    const result = whenCommandStarts('creer').catch((failure: unknown) => failure);
    await whenWriteAnswers(ROUTE, 404, { type: 'urn:glm:erreur:element-de-fabrication:element-de-fabrication-introuvable' });

    expect(await result).toBeInstanceOf(HttpErrorResponse);
  });

  it.each([
    ['creer', ROUTE],
    ['modifier', `${ROUTE}/moule-1`],
  ] as const)('should reject an unknown business code during %s', async (action, url) => {
    const result = whenCommandStarts(action).catch((failure: unknown) => failure);
    await whenWriteAnswers(url, 409, { type: 'urn:glm:erreur:element-de-fabrication:inconnu' });

    expect(await result).toBeInstanceOf(HttpErrorResponse);
  });

  it.each([
    ['creer', ROUTE],
    ['modifier', `${ROUTE}/moule-1`],
  ] as const)('should reject a technical failure during %s', async (action, url) => {
    const result = whenCommandStarts(action).catch((failure: unknown) => failure);
    await whenWriteAnswers(url, 500, {});

    expect(await result).toBeInstanceOf(HttpErrorResponse);
  });

  it('should send only the fields the manager filled in', async () => {
    const result = port.creer({ kind: 'CREATION', type: 'ORDRE_DE_FABRICATION', reference: undefined, libelle: undefined });
    const request = await whenWriteAnswers(ROUTE, 201, {});

    await result;
    expect(request.request.body).toEqual({ type: 'ORDRE_DE_FABRICATION' });
  });

  const whenCommandStarts = (action: 'creer' | 'modifier') => {
    switch (action) {
      case 'creer':
        return port.creer({
          kind: 'CREATION',
          type: 'PRODUIT',
          reference: new ReferenceDElement('1015'),
          libelle: new LibelleDElement('Moule de capot'),
        });
      case 'modifier':
        return port.modifier({
          kind: 'MODIFICATION',
          id: new ElementDeFabricationId('moule-1'),
          reference: new ReferenceDElement('1015'),
          libelle: undefined,
        });
    }
  };

  const whenReadAnswers = async (elements: readonly RestElement[]): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(candidate => candidate.method === 'GET' && candidate.url === ROUTE);
    request.flush({ content: elements, currentPage: 0, pageSize: 20, totalElementsCount: elements.length });
    return request;
  };

  const whenReadFails = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server.expectOne(candidate => candidate.method === 'GET' && candidate.url === ROUTE).flush({}, { status: 500, statusText: 'Failure' });
  };

  const whenWriteAnswers = async (url: string, status: number, body: object | null): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(url);
    request.flush(body, { status, statusText: 'Response' });
    return request;
  };
});
