import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { AtelierFixture } from '@test/unit/fixtures/gestion/atelier/AtelierFixture';
import { defer, Observable, of, switchMap, throwError } from 'rxjs';
import { AtelierPort } from '../../domain/AtelierPort';
import { ElementDeFabricationIntrouvable } from '../../domain/ElementDeFabricationIntrouvable';
import { ElementDejaALAtelier } from '../../domain/ElementDejaALAtelier';
import { ElementEngageId } from '../../domain/ElementEngageId';
import { SuiviId } from '../../domain/SuiviId';
import { SuiviIntrouvable } from '../../domain/SuiviIntrouvable';
import { HttpAtelier } from './HttpAtelier';

const ROUTE = '/api/atelier/suivis';
const URN = 'urn:glm:erreur:atelier:';

interface PassageFixture {
  readonly element: string;
}

const notFound = (): HttpErrorResponse => new HttpErrorResponse({ status: 404, statusText: 'Not Found' });

const refus = (status: number, code: string): HttpErrorResponse =>
  new HttpErrorResponse({ status, statusText: 'Refused', error: { type: `${URN}${code}` } });

const estUnEngagement = (request: HttpRequest<unknown>, pathname: string): boolean => request.method === 'POST' && pathname === ROUTE;

class AtelierHttpBackendFixture implements HttpBackend {
  elementsConnus: readonly string[] = [];
  private readonly passages = new Map<string, PassageFixture>();

  suiviDe(element: string): string | undefined {
    return [...this.passages].find(([, passage]) => passage.element === element)?.[0];
  }

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    return defer(() => this.answer(request)).pipe(
      switchMap(answer => (answer instanceof HttpErrorResponse ? throwError(() => answer) : of(answer))),
    );
  }

  private async answer(request: HttpRequest<unknown>): Promise<HttpResponse<unknown> | HttpErrorResponse> {
    await new Promise(resolve => setTimeout(resolve));
    const { pathname } = new URL(request.urlWithParams, 'http://localhost');
    if (estUnEngagement(request, pathname)) return this.engage((request.body as { element: string }).element);
    const suivi = /^\/api\/atelier\/suivis\/([^/]+)\/cloture$/.exec(pathname)?.[1];
    if (suivi === undefined) return notFound();
    return this.revise(suivi, request.method === 'PUT');
  }

  private engage(element: string): HttpResponse<unknown> | HttpErrorResponse {
    if (this.suiviDe(element) !== undefined) return refus(409, 'element-deja-engage');
    if (!this.elementsConnus.includes(element)) return refus(404, 'element-de-fabrication-introuvable');
    this.passages.set(`suivi-${element}`, { element });
    return new HttpResponse({ status: 201, body: { id: `suivi-${element}` } });
  }

  private revise(suivi: string, clos: boolean): HttpResponse<unknown> | HttpErrorResponse {
    if (!this.passages.has(suivi)) return refus(404, 'suivi-d-atelier-introuvable');
    return new HttpResponse({ status: clos ? 200 : 204, body: {} });
  }
}

interface AtelierHarness {
  readonly port: AtelierPort;
  connait(element: string): void;
  suiviDe(element: string): string;
}

const createHttpHarness = (): AtelierHarness => {
  const backend = new AtelierHttpBackendFixture();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      { provide: HttpBackend, useValue: backend },
      ApiClient,
      { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      HttpAtelier,
    ],
  });
  return {
    port: TestBed.inject(HttpAtelier),
    connait: element => {
      backend.elementsConnus = [...backend.elementsConnus, element];
    },
    suiviDe: element => backend.suiviDe(element) ?? '',
  };
};

const createFixtureHarness = (): AtelierHarness => {
  const fixture = new AtelierFixture();
  return {
    port: fixture,
    connait: element => {
      fixture.elementsConnus = [...fixture.elementsConnus, element];
    },
    suiviDe: element => fixture.suiviDe(element) ?? '',
  };
};

const adapters: [string, () => AtelierHarness][] = [
  ['HttpAtelier', createHttpHarness],
  ['AtelierFixture', createFixtureHarness],
];

describe.each(adapters)('AtelierPort contract, honoured by %s', (_adapter, createHarness) => {
  let harness: AtelierHarness;

  beforeEach(() => {
    harness = createHarness();
  });

  it('should put a known element at the workshop', async () => {
    harness.connait('moule-1');

    const resultat = await whenPuttingAtWorkshop('moule-1');

    expect(resultat).toEqual({ ok: true, value: undefined });
  });

  it('should refuse to put an element that is already at the workshop', async () => {
    await givenAtWorkshop('moule-1');

    const resultat = await whenPuttingAtWorkshop('moule-1');

    expect(resultat).toEqual({ ok: false, error: new ElementDejaALAtelier() });
  });

  it('should refuse to put back an element whose passage is closed: it is reopened instead', async () => {
    await givenAtWorkshop('moule-1');
    await harness.port.cloturer(new SuiviId(harness.suiviDe('moule-1')));

    const resultat = await whenPuttingAtWorkshop('moule-1');

    expect(resultat).toEqual({ ok: false, error: new ElementDejaALAtelier() });
  });

  it('should refuse to put an element the referential does not know', async () => {
    const resultat = await whenPuttingAtWorkshop('inconnu');

    expect(resultat).toEqual({ ok: false, error: new ElementDeFabricationIntrouvable() });
  });

  it('should close the passage of an element at the workshop', async () => {
    await givenAtWorkshop('moule-1');

    const resultat = await harness.port.cloturer(new SuiviId(harness.suiviDe('moule-1')));

    expect(resultat).toEqual({ ok: true, value: undefined });
  });

  it('should reopen a closed passage', async () => {
    await givenAtWorkshop('moule-1');
    const suivi = new SuiviId(harness.suiviDe('moule-1'));
    await harness.port.cloturer(suivi);

    const resultat = await harness.port.rouvrir(suivi);

    expect(resultat).toEqual({ ok: true, value: undefined });
  });

  it.each(['cloturer', 'rouvrir'] as const)('should refuse to %s a passage the workshop does not track', async acte => {
    const resultat = await harness.port[acte](new SuiviId('suivi-inconnu'));

    expect(resultat).toEqual({ ok: false, error: new SuiviIntrouvable() });
  });

  const givenAtWorkshop = async (element: string): Promise<void> => {
    harness.connait(element);
    await harness.port.mettreALAtelier(new ElementEngageId(element));
  };

  const whenPuttingAtWorkshop = (element: string) => harness.port.mettreALAtelier(new ElementEngageId(element));
});

describe('Beyond the contract: HttpAtelier', () => {
  let port: AtelierPort;
  let server: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiClient,
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
        HttpAtelier,
      ],
    });
    port = TestBed.inject(HttpAtelier);
    server = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    server.verify();
  });

  it('should send an engagement carrying the element alone, with no date', async () => {
    const result = port.mettreALAtelier(new ElementEngageId('moule-9'));
    const request = await whenWriteAnswers('POST', ROUTE, 201, {});

    await result;
    expect(request.request.body).toEqual({ element: 'moule-9' });
  });

  it('should send a closure with an empty body so the server dates it', async () => {
    const result = port.cloturer(new SuiviId('suivi-1'));
    const request = await whenWriteAnswers('PUT', `${ROUTE}/suivi-1/cloture`, 200, {});

    await result;
    expect(request.request.body).toEqual({});
  });

  it('should keep a closure refusal unknown to closure a technical failure', async () => {
    const result = port.cloturer(new SuiviId('suivi-1')).catch((failure: unknown) => failure);
    await whenWriteAnswers('PUT', `${ROUTE}/suivi-1/cloture`, 409, { type: `${URN}element-deja-engage` });

    expect(await result).toBeInstanceOf(HttpErrorResponse);
  });

  it.each([
    ['mettreALAtelier', 'POST', ROUTE],
    ['cloturer', 'PUT', `${ROUTE}/suivi-1/cloture`],
    ['rouvrir', 'DELETE', `${ROUTE}/suivi-1/cloture`],
  ] as const)('should reject an unknown business code during %s', async (action, method, url) => {
    const result = whenCommandStarts(action).catch((failure: unknown) => failure);
    await whenWriteAnswers(method, url, 409, { type: `${URN}inconnu` });

    expect(await result).toBeInstanceOf(HttpErrorResponse);
  });

  it.each([
    ['mettreALAtelier', 'POST', ROUTE],
    ['cloturer', 'PUT', `${ROUTE}/suivi-1/cloture`],
    ['rouvrir', 'DELETE', `${ROUTE}/suivi-1/cloture`],
  ] as const)('should reject a technical failure during %s', async (action, method, url) => {
    const result = whenCommandStarts(action).catch((failure: unknown) => failure);
    await whenWriteAnswers(method, url, 500, {});

    expect(await result).toBeInstanceOf(HttpErrorResponse);
  });

  const whenCommandStarts = (action: 'mettreALAtelier' | 'cloturer' | 'rouvrir') => {
    switch (action) {
      case 'mettreALAtelier':
        return port.mettreALAtelier(new ElementEngageId('moule-9'));
      case 'cloturer':
        return port.cloturer(new SuiviId('suivi-1'));
      case 'rouvrir':
        return port.rouvrir(new SuiviId('suivi-1'));
    }
  };

  const whenWriteAnswers = async (method: string, url: string, status: number, body: object): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(candidate => candidate.method === method && candidate.url === url);
    request.flush(body, { status, statusText: 'Response' });
    return request;
  };
});
