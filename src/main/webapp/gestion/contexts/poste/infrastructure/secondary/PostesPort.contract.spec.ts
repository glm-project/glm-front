import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
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
import { NatureDeTravailId } from '../../domain/NatureDeTravailId';
import { NatureInconnue } from '../../domain/NatureInconnue';
import { PosteDeTravail } from '../../domain/PosteDeTravail';
import { PosteDeTravailId } from '../../domain/PosteDeTravailId';
import { PosteIntrouvable } from '../../domain/PosteIntrouvable';
import { PosteNonSupprimable } from '../../domain/PosteNonSupprimable';
import { PostesPort } from '../../domain/PostesPort';
import { RefusCreationPoste } from '../../domain/RefusCreationPoste';
import { RefusModificationPoste } from '../../domain/RefusModificationPoste';
import { RefusSuppressionPoste } from '../../domain/RefusSuppressionPoste';
import { HttpPostes } from './HttpPostes';

type RestPoste = components['schemas']['RestPosteDeTravail'];

const tourFixture: RestPoste = { id: 'tour-1', libelle: 'Tour 1', nature: 'tournage', natureId: 'nature-tournage', coutHoraire: 45.5 };
const scieFixture: RestPoste = { id: 'scie-1', libelle: 'Scie 1', nature: 'sciage', natureId: 'nature-sciage' };

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
        return this.handlePost(pathname, request.body as { libelle: string; natureId: string; coutHoraire?: number });
      case 'PUT':
        return this.handlePut(pathname, request.body as { libelle: string; natureId: string; coutHoraire?: number });
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
    body: { libelle: string; natureId: string; coutHoraire?: number },
  ): HttpResponse<unknown> | HttpErrorResponse {
    if (pathname !== '/api/postes-de-travail') {
      return new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    }
    const created: RestPoste = {
      id: 'created-poste',
      libelle: body.libelle,
      nature: body.natureId.replace('nature-', ''),
      natureId: body.natureId,
      ...(body.coutHoraire !== undefined ? { coutHoraire: body.coutHoraire } : {}),
    };
    this.postes = [...this.postes, created];
    return new HttpResponse({ status: 201, body: created });
  }

  private handlePut(
    pathname: string,
    body: { libelle: string; natureId: string; coutHoraire?: number },
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
            nature: body.natureId.replace('nature-', ''),
            natureId: body.natureId,
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
            natureId: new NatureDeTravailId(poste.natureId),
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

  it('should return the complete referential across server pages', async () => {
    givenManyWorkstations(125);

    const entries = await port.referentiel();

    expect(entries).toHaveLength(125);
  });

  it('should return the workstations with their domain values', async () => {
    givenWorkstations([tourFixture, scieFixture]);

    const entries = await port.referentiel();

    thenWorkstationsMatch(entries, [
      { id: 'tour-1', libelle: 'Tour 1', nature: 'tournage', coutHoraire: 45.5 },
      { id: 'scie-1', libelle: 'Scie 1', nature: 'sciage' },
    ]);
  });

  it('should return an empty referential for an empty workshop', async () => {
    givenWorkstations([]);

    thenWorkstationsMatch(await port.referentiel(), []);
  });

  it('should create a workstation with hourly cost and reflect it in queries', async () => {
    givenWorkstations([scieFixture]);
    const resultat = await whenCreatingWorkstation('Tour 1', 'tournage', 45.5);

    thenCommandSucceeded(resultat);
    await thenWorkstationExists('Tour 1', 'tournage', 45.5);
  });

  it('should create a labour-only workstation at zero hourly cost and reflect it in queries', async () => {
    const resultat = await whenCreatingWorkstation('Établi 1', 'montage', 0);

    thenCommandSucceeded(resultat);
    await thenWorkstationExists('Établi 1', 'montage', 0);
  });

  it('should update an existing workstation and reflect changes in queries', async () => {
    givenWorkstations([tourFixture]);

    const resultat = await whenModifyingWorkstation('tour-1', 'Tour 1 Modifié', 'fraisage', 52);

    thenCommandSucceeded(resultat);
    await thenWorkstationExists('Tour 1 Modifié', 'fraisage', 52);
  });

  it('should remove a workstation and reflect its absence in queries', async () => {
    givenWorkstations([tourFixture]);

    const resultat = await whenDeletingWorkstation('tour-1');

    thenCommandSucceeded(resultat);
    await thenWorkstationDoesNotExist('tour-1');
  });

  const givenWorkstations = (postes: readonly RestPoste[]): void => {
    harness.seed(postes);
  };

  const givenManyWorkstations = (count: number): void => {
    const postes: RestPoste[] = Array.from({ length: count }, (_, index) => ({
      id: `p-${index}`,
      libelle: `Poste ${index}`,
      nature: 'fraisage',
      natureId: 'nature-fraisage',
    }));
    harness.seed(postes);
  };

  const whenCreatingWorkstation = (libelle: string, nature: string, coutHoraire: number): Promise<Result<void, RefusCreationPoste>> =>
    port.creer({
      type: 'CREATION',
      libelle: new LibellePoste(libelle),
      natureId: new NatureDeTravailId('nature-' + nature),
      coutHoraire: new CoutHoraire(coutHoraire),
    });

  const whenModifyingWorkstation = (
    id: string,
    libelle: string,
    nature: string,
    coutHoraire: number,
  ): Promise<Result<void, RefusModificationPoste>> =>
    port.modifier({
      type: 'MODIFICATION',
      id: new PosteDeTravailId(id),
      libelle: new LibellePoste(libelle),
      natureId: new NatureDeTravailId('nature-' + nature),
      coutHoraire: new CoutHoraire(coutHoraire),
    });

  const whenDeletingWorkstation = (id: string): Promise<Result<void, RefusSuppressionPoste>> => port.supprimer(new PosteDeTravailId(id));

  const thenCommandSucceeded = (resultat: Result<void, unknown>): void => {
    expect(resultat).toEqual({ ok: true, value: undefined });
  };

  const thenWorkstationsMatch = (
    entries: readonly PosteDeTravail[],
    expected: readonly { id: string; libelle: string; nature: string; coutHoraire?: number }[],
  ): void => {
    expect(
      entries.map(poste => ({
        id: poste.id.value,
        libelle: poste.libelle.value,
        nature: poste.nature.value,
        ...(poste.coutHoraire !== undefined ? { coutHoraire: poste.coutHoraire.value } : {}),
      })),
    ).toEqual(expected);
  };

  const thenWorkstationExists = async (libelle: string, nature: string, coutHoraire?: number): Promise<void> => {
    const matching = (await port.referentiel()).find(poste => poste.libelle.value === libelle);
    expect(matching).toBeDefined();
    expect(matching?.nature.value).toBe(nature);
    expect(matching?.coutHoraire?.value).toBe(coutHoraire);
    expect(matching?.natureId.value).toBe('nature-' + nature);
  };

  const thenWorkstationDoesNotExist = async (id: string): Promise<void> => {
    expect((await port.referentiel()).some(poste => poste.id.value === id)).toBe(false);
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

  it('should report a technical read failure to ErrorHandlerPort and reject', async () => {
    const result = port.referentiel().catch((failure: unknown) => failure);
    await whenServerFails('/api/postes-de-travail?page=0&size=100', 500);

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
    expect(errorHandler.errors[0]).toBeInstanceOf(HttpErrorResponse);
  });

  it.each([
    ['creer', '/api/postes-de-travail', 409, 'libelle-deja-utilise', new LibellePosteDejaUtilise()],
    ['modifier', '/api/postes-de-travail/tour-1', 409, 'libelle-deja-utilise', new LibellePosteDejaUtilise()],
    ['creer', '/api/postes-de-travail', 422, 'nature-inconnue', new NatureInconnue()],
    ['modifier', '/api/postes-de-travail/tour-1', 422, 'nature-inconnue', new NatureInconnue()],
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

  const whenCommandStarts = (action: 'creer' | 'modifier' | 'supprimer') => {
    switch (action) {
      case 'creer':
        return port.creer({
          type: 'CREATION',
          libelle: new LibellePoste('Tour 1'),
          natureId: new NatureDeTravailId('nature-tournage'),
          coutHoraire: new CoutHoraire(45.5),
        });
      case 'modifier':
        return port.modifier({
          type: 'MODIFICATION',
          id: new PosteDeTravailId('tour-1'),
          libelle: new LibellePoste('Tour 1'),
          natureId: new NatureDeTravailId('nature-tournage'),
          coutHoraire: new CoutHoraire(45.5),
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

  const whenServerFails = async (url: string, status: number, body: object = {}): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server.expectOne(url).flush(body, { status, statusText: 'Failure' });
  };
});
