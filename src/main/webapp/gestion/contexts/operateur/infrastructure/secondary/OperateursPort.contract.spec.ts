import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { Result } from '@/app/shared/result/domain/Result';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { OperateursFixture } from '@test/unit/fixtures/gestion/operateur/OperateursFixture';
import { defer, Observable, of, switchMap, throwError } from 'rxjs';
import { IdentiteDejaUtilisee } from '../../domain/IdentiteDejaUtilisee';
import { Matricule } from '../../domain/Matricule';
import { MatriculeDejaUtilise } from '../../domain/MatriculeDejaUtilise';
import { NomOperateur } from '../../domain/NomOperateur';
import { Operateur } from '../../domain/Operateur';
import { OperateurAyantPointe } from '../../domain/OperateurAyantPointe';
import { OperateurId } from '../../domain/OperateurId';
import { OperateurIntrouvable } from '../../domain/OperateurIntrouvable';
import { OperateursPort } from '../../domain/OperateursPort';
import { PosteHabilitable } from '../../domain/PosteHabilitable';
import { PosteHabilitableId } from '../../domain/PosteHabilitableId';
import { PosteHabilitableIntrouvable } from '../../domain/PosteHabilitableIntrouvable';
import { PrenomOperateur } from '../../domain/PrenomOperateur';
import { RefusCreationOperateur } from '../../domain/RefusCreationOperateur';
import { RefusModificationOperateur } from '../../domain/RefusModificationOperateur';
import { RefusSuppressionOperateur } from '../../domain/RefusSuppressionOperateur';
import { RequeteOperateurs } from '../../domain/RequeteOperateurs';
import { TauxHoraire } from '../../domain/TauxHoraire';
import { HttpOperateurs } from './HttpOperateurs';

type RestOperateur = components['schemas']['RestOperateur'];
type RestPoste = components['schemas']['RestPosteDeTravail'];
interface CorpsOperateur {
  nom: string;
  prenom: string;
  postes?: string[];
  matricule?: string;
  tauxHoraire?: number;
}

const tourFixture: RestPoste = { id: 'tour-1', libelle: 'Tour 1', nature: 'tournage' };
const scieFixture: RestPoste = { id: 'scie-1', libelle: 'Scie 1', nature: 'sciage' };

const naturesDe = (postes: readonly RestPoste[]): string[] =>
  [...new Set(postes.map(poste => poste.nature))].sort((left, right) => left.localeCompare(right, 'fr'));

const jeanFixture: RestOperateur = {
  id: 'jean',
  nom: 'Dupont',
  prenom: 'Jean',
  matricule: '049',
  tauxHoraire: 22,
  postes: [tourFixture],
  natures: ['tournage'],
};
const leaFixture: RestOperateur = { id: 'lea', nom: 'Martin', prenom: 'Léa', postes: [], natures: [] };

class OperateursHttpBackendFixture implements HttpBackend {
  operateurs: RestOperateur[] = [];
  postes: RestPoste[] = [];

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
        return this.handlePost(request.body as CorpsOperateur);
      case 'PUT':
        return this.handlePut(url.pathname, request.body as CorpsOperateur);
      case 'DELETE':
        return this.handleDelete(url.pathname);
      default:
        return new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    }
  }

  private handleGet(pathname: string, searchParams: URLSearchParams): HttpResponse<unknown> | HttpErrorResponse {
    const page = Number(searchParams.get('page') ?? '0');
    const size = Number(searchParams.get('size') ?? '20');
    if (pathname === '/api/operateurs') {
      return OperateursHttpBackendFixture.pageDe(this.operateurs, page, size);
    }
    if (pathname === '/api/postes-de-travail') {
      return OperateursHttpBackendFixture.pageDe(this.postes, page, size);
    }
    return new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
  }

  private static pageDe(elements: readonly unknown[], page: number, size: number): HttpResponse<unknown> {
    return new HttpResponse({
      status: 200,
      body: {
        content: elements.slice(page * size, (page + 1) * size),
        currentPage: page,
        pageSize: size,
        totalElementsCount: elements.length,
      },
    });
  }

  private handlePost(body: CorpsOperateur): HttpResponse<unknown> {
    const created = this.resolve('created-operateur', body);
    this.operateurs = [...this.operateurs, created];
    return new HttpResponse({ status: 201, body: created });
  }

  private handlePut(pathname: string, body: CorpsOperateur): HttpResponse<unknown> | HttpErrorResponse {
    const id = OperateursHttpBackendFixture.identifiantDans(pathname);
    if (id === undefined) {
      return new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    }
    this.operateurs = this.operateurs.map(operateur => (operateur.id === id ? this.resolve(id, body) : operateur));
    return new HttpResponse({ status: 200, body: this.operateurs.find(operateur => operateur.id === id) });
  }

  private handleDelete(pathname: string): HttpResponse<unknown> | HttpErrorResponse {
    const id = OperateursHttpBackendFixture.identifiantDans(pathname);
    if (id === undefined) {
      return new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    }
    this.operateurs = this.operateurs.filter(operateur => operateur.id !== id);
    return new HttpResponse({ status: 204, body: null });
  }

  private static identifiantDans(pathname: string): string | undefined {
    const prefixe = '/api/operateurs/';
    return pathname.startsWith(prefixe) ? pathname.substring(prefixe.length) : undefined;
  }

  private resolve(id: string, body: CorpsOperateur): RestOperateur {
    const postes = this.postes
      .filter(poste => (body.postes ?? []).includes(poste.id))
      .sort((left, right) => left.libelle.localeCompare(right.libelle, 'fr'));
    return {
      id,
      nom: body.nom,
      prenom: body.prenom,
      postes,
      natures: naturesDe(postes),
      ...(body.matricule === undefined ? {} : { matricule: body.matricule }),
      ...(body.tauxHoraire === undefined ? {} : { tauxHoraire: body.tauxHoraire }),
    };
  }
}

interface OperateursHarness {
  readonly port: OperateursPort;
  seed(operateurs: readonly RestOperateur[], postes: readonly RestPoste[]): void;
}

const createHttpHarness = (): OperateursHarness => {
  const backend = new OperateursHttpBackendFixture();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      { provide: HttpBackend, useValue: backend },
      ApiClient,
      { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      HttpOperateurs,
    ],
  });
  return {
    port: TestBed.inject(HttpOperateurs),
    seed: (operateurs, postes) => {
      backend.operateurs = [...operateurs];
      backend.postes = [...postes];
    },
  };
};

const toDomainPoste = (poste: RestPoste): PosteHabilitable =>
  new PosteHabilitable(new PosteHabilitableId(poste.id), { libelle: poste.libelle, nature: poste.nature });

const createFixtureHarness = (): OperateursHarness => {
  const fixture = new OperateursFixture();
  return {
    port: fixture,
    seed: (operateurs, postes) => {
      fixture.catalogue = postes.map(toDomainPoste);
      fixture.liste = operateurs.map(
        operateur =>
          new Operateur(new OperateurId(operateur.id), {
            nom: new NomOperateur(operateur.nom),
            prenom: new PrenomOperateur(operateur.prenom),
            matricule: operateur.matricule === undefined ? undefined : new Matricule(operateur.matricule),
            tauxHoraire: operateur.tauxHoraire === undefined ? undefined : new TauxHoraire(operateur.tauxHoraire),
            postes: operateur.postes.map(toDomainPoste),
            natures: operateur.natures,
          }),
      );
    },
  };
};

const adapters: [string, () => OperateursHarness][] = [
  ['HttpOperateurs', createHttpHarness],
  ['OperateursFixture', createFixtureHarness],
];

describe.each(adapters)('OperateursPort contract, honoured by %s', (_adapter, createHarness) => {
  let harness: OperateursHarness;
  let port: OperateursPort;

  beforeEach(() => {
    harness = createHarness();
    port = harness.port;
  });

  it('should return the requested page with domain values and the total count', async () => {
    givenReferential([jeanFixture, leaFixture], [tourFixture]);

    const page = await whenQueryingPage(0, 10);

    thenPageMatches(page, 2, [
      { id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', tauxHoraire: 22, postes: ['Tour 1'], natures: ['tournage'] },
      { id: 'lea', nom: 'Martin', prenom: 'Léa', postes: [], natures: [] },
    ]);
  });

  it('should slice pages according to the requested page and size', async () => {
    givenManyOperateurs(25);

    const page = await whenQueryingPage(1, 10);

    thenPageSliceMatches(page, 25, 10, 'o-10', 'o-19');
  });

  it('should return an empty page for a workshop without operators', async () => {
    givenReferential([], []);

    const page = await whenQueryingPage(0, 20);

    thenPageMatches(page, 0, []);
  });

  it('should offer the whole workstation catalogue ordered by label', async () => {
    givenReferential([], [tourFixture, scieFixture]);

    const postes = await whenQueryingCatalogue();

    thenCatalogueIs(postes, ['Scie 1', 'Tour 1']);
  });

  it('should offer an empty catalogue when no workstation is configured', async () => {
    givenReferential([], []);

    const postes = await whenQueryingCatalogue();

    thenCatalogueIs(postes, []);
  });

  it('should declare an operator with its optional entries and derive its trades', async () => {
    givenReferential([], [tourFixture, scieFixture]);

    const resultat = await whenDeclaring('Dupont', 'Jean', { matricule: '049', tauxHoraire: 22, postes: ['tour-1', 'scie-1'] });

    thenCommandSucceeded(resultat);
    await thenOperateurExists('Dupont', {
      matricule: '049',
      tauxHoraire: 22,
      postes: ['Scie 1', 'Tour 1'],
      natures: ['sciage', 'tournage'],
    });
  });

  it('should declare an operator without payroll number, hourly rate nor habilitation', async () => {
    givenReferential([], [tourFixture]);

    const resultat = await whenDeclaring('Martin', 'Léa', {});

    thenCommandSucceeded(resultat);
    await thenOperateurExists('Martin', { postes: [], natures: [] });
  });

  it('should replace the previous habilitations on revision', async () => {
    givenReferential([jeanFixture], [tourFixture, scieFixture]);

    const resultat = await whenRevising('jean', 'Dupont', 'Jean', { postes: ['scie-1'] });

    thenCommandSucceeded(resultat);
    await thenOperateurExists('Dupont', { postes: ['Scie 1'], natures: ['sciage'] });
  });

  it('should drop the payroll number and the hourly rate left blank on revision', async () => {
    givenReferential([jeanFixture], [tourFixture]);

    const resultat = await whenRevising('jean', 'Dupont', 'Jean', { postes: ['tour-1'] });

    thenCommandSucceeded(resultat);
    await thenOperateurExists('Dupont', { postes: ['Tour 1'], natures: ['tournage'] });
  });

  it('should remove an operator and reflect its absence in queries', async () => {
    givenReferential([jeanFixture], [tourFixture]);

    const resultat = await whenRemoving('jean');

    thenCommandSucceeded(resultat);
    await thenOperateurDoesNotExist('jean');
  });

  const givenReferential = (operateurs: readonly RestOperateur[], postes: readonly RestPoste[]): void => {
    harness.seed(operateurs, postes);
  };

  const givenManyOperateurs = (count: number): void => {
    harness.seed(
      Array.from({ length: count }, (_, index) => ({
        id: `o-${index}`,
        nom: `Nom ${index}`,
        prenom: `Prenom ${index}`,
        postes: [],
        natures: [],
      })),
      [],
    );
  };

  const whenQueryingPage = (page: number, size: number): Promise<Page<Operateur>> => port.operateurs(new RequeteOperateurs(page, size));

  const whenQueryingCatalogue = (): Promise<readonly PosteHabilitable[]> => port.postesHabilitables();

  const whenDeclaring = (nom: string, prenom: string, options: OptionsOperateur): Promise<Result<void, RefusCreationOperateur>> =>
    port.creer({ type: 'CREATION', ...attributs(nom, prenom, options) });

  const whenRevising = (
    id: string,
    nom: string,
    prenom: string,
    options: OptionsOperateur,
  ): Promise<Result<void, RefusModificationOperateur>> =>
    port.modifier({ type: 'MODIFICATION', id: new OperateurId(id), ...attributs(nom, prenom, options) });

  const whenRemoving = (id: string): Promise<Result<void, RefusSuppressionOperateur>> => port.supprimer(new OperateurId(id));

  const thenCommandSucceeded = (resultat: Result<void, unknown>): void => {
    expect(resultat).toEqual({ ok: true, value: undefined });
  };

  const thenPageMatches = (page: Page<Operateur>, total: number, expected: readonly ProjectionOperateur[]): void => {
    expect(page.totalCount).toBe(total);
    expect(page.elements.map(projeter)).toEqual(expected);
  };

  const thenPageSliceMatches = (page: Page<Operateur>, total: number, count: number, firstId: string, lastId: string): void => {
    expect(page.totalCount).toBe(total);
    expect(page.elements).toHaveLength(count);
    expect(page.elements[0]?.id.value).toBe(firstId);
    expect(page.elements[count - 1]?.id.value).toBe(lastId);
  };

  const thenCatalogueIs = (postes: readonly PosteHabilitable[], expected: readonly string[]): void => {
    expect(postes.map(poste => poste.libelle)).toEqual(expected);
  };

  const thenOperateurExists = async (nom: string, attendu: Omit<ProjectionOperateur, 'id' | 'nom' | 'prenom'>): Promise<void> => {
    const page = await port.operateurs(new RequeteOperateurs(0, 20));
    const matching = page.elements.find(operateur => operateur.nom.value === nom);
    expect(matching).toBeDefined();
    expect(matching?.matricule?.value).toBe(attendu.matricule);
    expect(matching?.tauxHoraire?.value).toBe(attendu.tauxHoraire);
    expect(matching?.postes.map(poste => poste.libelle)).toEqual(attendu.postes);
    expect(matching?.natures).toEqual(attendu.natures);
  };

  const thenOperateurDoesNotExist = async (id: string): Promise<void> => {
    const page = await port.operateurs(new RequeteOperateurs(0, 20));
    expect(page.elements.some(operateur => operateur.id.value === id)).toBe(false);
  };
});

interface OptionsOperateur {
  readonly matricule?: string;
  readonly tauxHoraire?: number;
  readonly postes?: readonly string[];
}

interface ProjectionOperateur {
  readonly id: string;
  readonly nom: string;
  readonly prenom: string;
  readonly matricule?: string;
  readonly tauxHoraire?: number;
  readonly postes: readonly string[];
  readonly natures: readonly string[];
}

const attributs = (nom: string, prenom: string, options: OptionsOperateur) => ({
  nom: new NomOperateur(nom),
  prenom: new PrenomOperateur(prenom),
  matricule: options.matricule === undefined ? undefined : new Matricule(options.matricule),
  tauxHoraire: options.tauxHoraire === undefined ? undefined : new TauxHoraire(options.tauxHoraire),
  postes: (options.postes ?? []).map(id => new PosteHabilitableId(id)),
});

const projeter = (operateur: Operateur): ProjectionOperateur => ({
  id: operateur.id.value,
  nom: operateur.nom.value,
  prenom: operateur.prenom.value,
  ...(operateur.matricule === undefined ? {} : { matricule: operateur.matricule.value }),
  ...(operateur.tauxHoraire === undefined ? {} : { tauxHoraire: operateur.tauxHoraire.value }),
  postes: operateur.postes.map(poste => poste.libelle),
  natures: operateur.natures,
});

describe('Beyond the contract: HttpOperateurs', () => {
  let port: OperateursPort;
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
        HttpOperateurs,
      ],
    });
    port = TestBed.inject(HttpOperateurs);
    server = TestBed.inject(HttpTestingController);
    errorHandler = TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture;
  });

  afterEach(() => {
    server.verify();
  });

  it('should report a technical read failure to ErrorHandlerPort and reject', async () => {
    const result = port.operateurs(new RequeteOperateurs(0, 20)).catch((failure: unknown) => failure);
    await whenServerFails('/api/operateurs?page=0&size=20');

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should serve the workstation catalogue from memory after a first acquisition', async () => {
    const premier = port.postesHabilitables();
    await whenCatalogueAnswers([tourFixture]);
    await premier;

    const second = await port.postesHabilitables();

    expect(second.map(poste => poste.libelle)).toEqual(['Tour 1']);
  });

  it('should reject an incomplete catalogue when the server stops providing entries', async () => {
    const result = port.postesHabilitables().catch((failure: unknown) => failure);
    await whenCatalogueAnswers([], 1);

    expect(await result).toEqual(new Error('Le référentiel des postes est incomplet.'));
    expect(errorHandler.errors).toEqual([new Error('Le référentiel des postes est incomplet.')]);
  });

  it('should reject a failed later catalogue page without retaining partial entries and allow retry', async () => {
    const result = port.postesHabilitables().catch((failure: unknown) => failure);
    await whenFirstCataloguePageAnswers();
    await whenServerFails('/api/postes-de-travail?page=1&size=100');
    const failure = await result;
    const retry = port.postesHabilitables();
    await whenCatalogueAnswers([...pleinePageFixture(), { id: 'p-100', libelle: 'Poste 100', nature: 'soudage' }]);

    expect(failure).toBeInstanceOf(HttpErrorResponse);
    expect((await retry).map(poste => poste.id.value)).toContain('p-100');
  });

  it.each([
    ['creer', '/api/operateurs', 409, 'identite-deja-utilisee', new IdentiteDejaUtilisee()],
    ['creer', '/api/operateurs', 409, 'matricule-deja-utilise', new MatriculeDejaUtilise()],
    ['creer', '/api/operateurs', 404, 'poste-de-travail-introuvable', new PosteHabilitableIntrouvable()],
    ['modifier', '/api/operateurs/jean', 409, 'identite-deja-utilisee', new IdentiteDejaUtilisee()],
    ['modifier', '/api/operateurs/jean', 404, 'operateur-introuvable', new OperateurIntrouvable()],
    ['modifier', '/api/operateurs/jean', 404, 'poste-de-travail-introuvable', new PosteHabilitableIntrouvable()],
    ['supprimer', '/api/operateurs/jean', 404, 'operateur-introuvable', new OperateurIntrouvable()],
    ['supprimer', '/api/operateurs/jean', 409, 'operateur-ayant-pointe', new OperateurAyantPointe()],
  ] as const)('should translate the %s refusal %s into the domain', async (action, url, status, code, refus) => {
    const result = whenCommandStarts(action);
    await whenWriteAnswers(url, status, { type: 'urn:glm:erreur:operateur:' + code });

    expect(await result).toEqual({ ok: false, error: refus });
  });

  it.each([
    ['creer', '/api/operateurs'],
    ['modifier', '/api/operateurs/jean'],
    ['supprimer', '/api/operateurs/jean'],
  ] as const)('should reject an unknown business code during %s', async (action, url) => {
    const result = whenCommandStarts(action).catch((failure: unknown) => failure);
    await whenWriteAnswers(url, 409, { type: 'urn:glm:erreur:operateur:inconnu' });

    expect(await result).toBeInstanceOf(HttpErrorResponse);
  });

  it.each([
    ['creer', '/api/operateurs'],
    ['modifier', '/api/operateurs/jean'],
    ['supprimer', '/api/operateurs/jean'],
  ] as const)('should reject a technical failure during %s', async (action, url) => {
    const result = whenCommandStarts(action).catch((failure: unknown) => failure);
    await whenWriteAnswers(url, 500, {});

    expect(await result).toBeInstanceOf(HttpErrorResponse);
  });

  const pleinePageFixture = (): RestPoste[] =>
    Array.from({ length: 100 }, (_, index) => ({ id: `p-${index}`, libelle: `Poste ${index}`, nature: 'tournage' }));

  const whenCommandStarts = (action: 'creer' | 'modifier' | 'supprimer') => {
    const communs = attributs('Dupont', 'Jean', { postes: ['tour-1'] });
    switch (action) {
      case 'creer':
        return port.creer({ type: 'CREATION', ...communs });
      case 'modifier':
        return port.modifier({ type: 'MODIFICATION', id: new OperateurId('jean'), ...communs });
      case 'supprimer':
        return port.supprimer(new OperateurId('jean'));
    }
  };

  const whenWriteAnswers = async (url: string, status: number, body: object): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(url);
    request.flush(body, { status, statusText: 'Response' });
    return request;
  };

  const whenFirstCataloguePageAnswers = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne('/api/postes-de-travail?page=0&size=100');
    request.flush({ content: pleinePageFixture(), currentPage: 0, pageSize: 100, totalElementsCount: 101 });
  };

  const whenCatalogueAnswers = async (postes: RestPoste[], totalElementsCount = postes.length): Promise<void> => {
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

  const whenServerFails = async (url: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server.expectOne(url).flush({}, { status: 500, statusText: 'Failure' });
  };
});
