import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { NaturesDeTravailFixture } from '@test/unit/fixtures/gestion/poste/NaturesDeTravailFixture';
import { defer, Observable, of, switchMap, throwError } from 'rxjs';
import { NatureDeTravail } from '../../domain/NatureDeTravail';
import { NatureDeTravailId } from '../../domain/NatureDeTravailId';
import { NatureGeree } from '../../domain/NatureGeree';
import { NaturesDeTravailPort } from '../../domain/NaturesDeTravailPort';
import { HttpNaturesDeTravail } from './HttpNaturesDeTravail';

const ROUTE = '/api/natures-de-travail';

interface NatureFixture {
  readonly id: string;
  readonly libelle: string;
  readonly utilisee: boolean;
  readonly postes: number;
}

class NaturesHttpBackendFixture implements HttpBackend {
  natures: NatureFixture[] = [];

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
    const page = Number(url.searchParams.get('page') ?? '0');
    const size = Number(url.searchParams.get('size') ?? '20');
    const triees = [...this.natures].sort((gauche, droite) => gauche.libelle.localeCompare(droite.libelle, 'fr'));
    return new HttpResponse({
      status: 200,
      body: {
        content: triees.slice(page * size, (page + 1) * size),
        currentPage: page,
        pageSize: size,
        totalElementsCount: triees.length,
      },
    });
  }
}

interface NaturesHarness {
  readonly port: NaturesDeTravailPort;
  declare(natures: readonly NatureFixture[]): void;
}

const createHttpHarness = (): NaturesHarness => {
  const backend = new NaturesHttpBackendFixture();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      { provide: HttpBackend, useValue: backend },
      ApiClient,
      { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      HttpNaturesDeTravail,
    ],
  });
  return {
    port: TestBed.inject(HttpNaturesDeTravail),
    declare: natures => {
      backend.natures = [...natures];
    },
  };
};

const createFixtureHarness = (): NaturesHarness => {
  const fixture = new NaturesDeTravailFixture();
  return {
    port: fixture,
    declare: natures => {
      fixture.liste = natures.map(geree);
    },
  };
};

const geree = (nature: NatureFixture): NatureGeree =>
  new NatureGeree(new NatureDeTravailId(nature.id), new NatureDeTravail(nature.libelle), nature.postes);

const tournageFixture: NatureFixture = { id: 'nature-tournage', libelle: 'Tournage', utilisee: true, postes: 2 };
const dessinFixture: NatureFixture = { id: 'nature-dessin', libelle: 'Dessin', utilisee: false, postes: 0 };
const peintureFixture: NatureFixture = { id: 'nature-peinture', libelle: 'Peinture', utilisee: true, postes: 0 };

const adapters: [string, () => NaturesHarness][] = [
  ['HttpNaturesDeTravail', createHttpHarness],
  ['NaturesDeTravailFixture', createFixtureHarness],
];

describe.each(adapters)('NaturesDeTravailPort contract, honoured by %s', (_adapter, createHarness) => {
  let harness: NaturesHarness;

  beforeEach(() => {
    harness = createHarness();
  });

  it('should list the natures by label, each with its poste count', async () => {
    harness.declare([tournageFixture, dessinFixture, peintureFixture]);

    const natures = await harness.port.natures();

    expect(natures).toEqual([geree(dessinFixture), geree(peintureFixture), geree(tournageFixture)]);
  });
});

describe('Beyond the contract: HttpNaturesDeTravail', () => {
  let port: HttpNaturesDeTravail;
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
        HttpNaturesDeTravail,
      ],
    });
    port = TestBed.inject(HttpNaturesDeTravail);
    server = TestBed.inject(HttpTestingController);
    errorHandler = TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture;
  });

  afterEach(() => {
    server.verify();
  });

  it('should report a technical read failure once and reject', async () => {
    const result = port.natures().catch((failure: unknown) => failure);
    await whenServerFails();

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  const whenServerFails = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server.expectOne(candidate => candidate.url === ROUTE).flush({}, { status: 500, statusText: 'Response' });
  };
});
