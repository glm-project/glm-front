import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Page } from '@/app/shared/pagination/domain/Page';
import { Result } from '@/app/shared/result/domain/Result';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import {
  AtelierFixture,
  AUTEUR_FIXTURE,
  CLOTURE_FIXTURE,
  ENGAGEMENT_FIXTURE,
  PhotographieDElement,
} from '@test/unit/fixtures/gestion/atelier/AtelierFixture';
import { defer, Observable, of, switchMap, throwError } from 'rxjs';
import { ActeDAtelier } from '../../domain/ActeDAtelier';
import { AtelierPort } from '../../domain/AtelierPort';
import { ElementALAtelier } from '../../domain/ElementALAtelier';
import { ElementDeFabricationIntrouvable } from '../../domain/ElementDeFabricationIntrouvable';
import { ElementDejaALAtelier } from '../../domain/ElementDejaALAtelier';
import { ElementEngageId } from '../../domain/ElementEngageId';
import { EtatALAtelier } from '../../domain/EtatALAtelier';
import { InstantDAtelier } from '../../domain/InstantDAtelier';
import { NomDElementEngage } from '../../domain/NomDElementEngage';
import { RefusMiseALAtelier } from '../../domain/RefusMiseALAtelier';
import { RequeteAtelier } from '../../domain/RequeteAtelier';
import { SuiviId } from '../../domain/SuiviId';
import { SuiviIntrouvable } from '../../domain/SuiviIntrouvable';
import { TypeDElementEngage } from '../../domain/TypeDElementEngage';
import { HttpAtelier } from './HttpAtelier';

type RestSuivi = components['schemas']['RestSuiviDAtelierEnGrille'];

const ROUTE = '/api/atelier/suivis';
const URN = 'urn:glm:erreur:atelier:';

interface SuiviFixture {
  readonly id: string;
  readonly element: string;
  readonly nom: string;
  readonly type: TypeDElementEngage;
  readonly etat: EtatALAtelier;
  readonly clotureLe?: string;
  readonly cloturePar?: string;
}

const mouleEnCoursFixture: SuiviFixture = {
  id: 'suivi-1',
  element: 'moule-1',
  nom: 'PRD-2026-000001',
  type: 'PRODUIT',
  etat: 'EN_COURS',
};
const ofEnAttenteFixture: SuiviFixture = {
  id: 'suivi-2',
  element: 'of-1',
  nom: 'OF-2026-000042',
  type: 'ORDRE_DE_FABRICATION',
  etat: 'EN_ATTENTE',
};
const mouleClotureFixture: SuiviFixture = {
  id: 'suivi-3',
  element: 'moule-2',
  nom: 'PRD-2026-000002',
  type: 'PRODUIT',
  etat: 'CLOTURE',
  clotureLe: CLOTURE_FIXTURE,
  cloturePar: AUTEUR_FIXTURE,
};

const referentielFixture: [string, PhotographieDElement][] = [
  ['moule-1', { nom: 'PRD-2026-000001', type: 'PRODUIT' }],
  ['moule-2', { nom: 'PRD-2026-000002', type: 'PRODUIT' }],
  ['of-1', { nom: 'OF-2026-000042', type: 'ORDRE_DE_FABRICATION' }],
  ['moule-9', { nom: 'PRD-2026-000009', type: 'PRODUIT' }],
];

interface ProjectionSuivi {
  readonly suivi: string;
  readonly nom: string;
  readonly type: string;
  readonly etat: string;
  readonly cloture: string | undefined;
}

const projeter = (element: ElementALAtelier): ProjectionSuivi => ({
  suivi: element.suivi.value,
  nom: element.nom.value,
  type: element.type,
  etat: element.etat,
  cloture: element.cloture?.instant.value.toISOString(),
});

const toRest = (suivi: SuiviFixture): RestSuivi => ({
  activitesEnCours: [],
  element: suivi.element,
  engageLe: ENGAGEMENT_FIXTURE,
  engagePar: AUTEUR_FIXTURE,
  etat: suivi.etat,
  id: suivi.id,
  nom: suivi.nom,
  type: suivi.type,
  ...(suivi.clotureLe === undefined ? {} : { clotureLe: suivi.clotureLe }),
  ...(suivi.cloturePar === undefined ? {} : { cloturePar: suivi.cloturePar }),
});

const toDomain = (suivi: SuiviFixture): ElementALAtelier =>
  new ElementALAtelier(new SuiviId(suivi.id), {
    element: new ElementEngageId(suivi.element),
    nom: new NomDElementEngage(suivi.nom),
    type: suivi.type,
    etat: suivi.etat,
    engagement: new ActeDAtelier(new InstantDAtelier(ENGAGEMENT_FIXTURE), AUTEUR_FIXTURE),
    cloture: suivi.clotureLe === undefined ? undefined : new ActeDAtelier(new InstantDAtelier(suivi.clotureLe), AUTEUR_FIXTURE),
  });

class AtelierHttpBackendFixture implements HttpBackend {
  suivis: SuiviFixture[] = [];
  readonly photographies = new Map<string, PhotographieDElement>();
  private suivant = 0;

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
        return this.handlePost(url.pathname, request.body as { element: string });
      case 'PUT':
        return this.change(url.pathname, suivi => this.ferme(suivi));
      default:
        return this.change(url.pathname, suivi => this.ouvre(suivi));
    }
  }

  private handleGet(pathname: string, searchParams: URLSearchParams): HttpResponse<unknown> | HttpErrorResponse {
    if (pathname !== ROUTE) {
      return notFound();
    }
    const etats = searchParams.getAll('etats');
    const page = Number(searchParams.get('page') ?? '0');
    const size = Number(searchParams.get('size') ?? '20');
    const retenus = this.suivis.filter(suivi => etats.includes(suivi.etat));
    return new HttpResponse({
      status: 200,
      body: {
        content: retenus.slice(page * size, (page + 1) * size).map(toRest),
        currentPage: page,
        pageSize: size,
        totalElementsCount: retenus.length,
      },
    });
  }

  private handlePost(pathname: string, body: { element: string }): HttpResponse<unknown> | HttpErrorResponse {
    if (pathname !== ROUTE) {
      return notFound();
    }
    if (this.suivis.some(suivi => suivi.element === body.element && suivi.etat !== 'CLOTURE')) {
      return refus(409, 'element-deja-engage');
    }
    const photographie = this.photographies.get(body.element);
    if (photographie === undefined) {
      return refus(404, 'element-de-fabrication-introuvable');
    }
    this.suivant += 1;
    const cree: SuiviFixture = {
      id: `suivi-cree-${String(this.suivant)}`,
      element: body.element,
      nom: photographie.nom,
      type: photographie.type,
      etat: 'EN_ATTENTE',
    };
    this.suivis = [...this.suivis, cree];
    return new HttpResponse({ status: 201, body: toRest(cree) });
  }

  private change(pathname: string, transforme: (suivi: SuiviFixture) => SuiviFixture): HttpResponse<unknown> | HttpErrorResponse {
    const id = identifiantDans(pathname);
    if (this.inconnu(id)) {
      return refus(404, 'suivi-d-atelier-introuvable');
    }
    this.suivis = this.suivis.map(suivi => (suivi.id === id ? transforme(suivi) : suivi));
    return new HttpResponse({ status: 200, body: {} });
  }

  private inconnu(id: string | undefined): boolean {
    return id === undefined ? true : !this.suivis.some(suivi => suivi.id === id);
  }

  private ferme(suivi: SuiviFixture): SuiviFixture {
    return { ...suivi, etat: 'CLOTURE', clotureLe: CLOTURE_FIXTURE, cloturePar: AUTEUR_FIXTURE };
  }

  private ouvre(suivi: SuiviFixture): SuiviFixture {
    return { id: suivi.id, element: suivi.element, nom: suivi.nom, type: suivi.type, etat: 'EN_ATTENTE' };
  }
}

const clotureSansAuteurFixture: RestSuivi = {
  activitesEnCours: [],
  clotureLe: CLOTURE_FIXTURE,
  element: 'moule-2',
  engageLe: ENGAGEMENT_FIXTURE,
  engagePar: AUTEUR_FIXTURE,
  etat: 'CLOTURE',
  id: 'suivi-3',
  nom: 'PRD-2026-000002',
  type: 'PRODUIT',
};

const notFound = (): HttpErrorResponse => new HttpErrorResponse({ status: 404, statusText: 'Not Found' });

const refus = (status: number, code: string): HttpErrorResponse =>
  new HttpErrorResponse({ status, statusText: 'Refused', error: { type: `${URN}${code}` } });

const identifiantDans = (pathname: string): string | undefined => {
  const parties = pathname.split('/');
  return parties.length === 6 && parties[5] === 'cloture' ? parties[4] : undefined;
};

interface AtelierHarness {
  readonly port: AtelierPort;
  seed(suivis: readonly SuiviFixture[]): void;
  seedReferentiel(photographies: readonly [string, PhotographieDElement][]): void;
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
    seed: (suivis: readonly SuiviFixture[]) => {
      backend.suivis = [...suivis];
    },
    seedReferentiel: (photographies: readonly [string, PhotographieDElement][]) => {
      for (const [id, photographie] of photographies) backend.photographies.set(id, photographie);
    },
  };
};

const createFixtureHarness = (): AtelierHarness => {
  const fixture = new AtelierFixture();
  return {
    port: fixture,
    seed: (suivis: readonly SuiviFixture[]) => {
      fixture.liste = suivis.map(toDomain);
    },
    seedReferentiel: (photographies: readonly [string, PhotographieDElement][]) => {
      for (const [id, photographie] of photographies) fixture.photographies.set(id, photographie);
    },
  };
};

const adapters: [string, () => AtelierHarness][] = [
  ['HttpAtelier', createHttpHarness],
  ['AtelierFixture', createFixtureHarness],
];

describe.each(adapters)('AtelierPort contract, honoured by %s', (_adapter, createHarness) => {
  let harness: AtelierHarness;
  let port: AtelierPort;

  beforeEach(() => {
    harness = createHarness();
    port = harness.port;
    harness.seedReferentiel(referentielFixture);
  });

  it('should show what is at the workshop, closed elements excluded', async () => {
    givenWorkshop([mouleEnCoursFixture, ofEnAttenteFixture, mouleClotureFixture]);

    const page = await whenReading('ACTIFS');

    expect(page.totalCount).toBe(2);
    expect(page.elements.map(projeter)).toEqual([
      { suivi: 'suivi-1', nom: 'PRD-2026-000001', type: 'PRODUIT', etat: 'EN_COURS', cloture: undefined },
      { suivi: 'suivi-2', nom: 'OF-2026-000042', type: 'ORDRE_DE_FABRICATION', etat: 'EN_ATTENTE', cloture: undefined },
    ]);
  });

  it('should show closed elements with the instant they were closed', async () => {
    givenWorkshop([mouleEnCoursFixture, mouleClotureFixture]);

    const page = await whenReading('CLOTURES');

    expect(page.totalCount).toBe(1);
    expect(page.elements.map(projeter)).toEqual([
      { suivi: 'suivi-3', nom: 'PRD-2026-000002', type: 'PRODUIT', etat: 'CLOTURE', cloture: CLOTURE_FIXTURE },
    ]);
  });

  it('should return an empty page for an empty workshop', async () => {
    givenWorkshop([]);

    const page = await whenReading('ACTIFS');

    expect(page.totalCount).toBe(0);
    expect(page.elements).toEqual([]);
  });

  it('should put an element at the workshop and list it as waiting', async () => {
    givenWorkshop([]);

    const resultat = await whenPuttingAtWorkshop('moule-9');

    expect(resultat).toEqual({ ok: true, value: undefined });
    expect(await whenListing('ACTIFS')).toEqual([
      { suivi: 'suivi-cree-1', nom: 'PRD-2026-000009', type: 'PRODUIT', etat: 'EN_ATTENTE', cloture: undefined },
    ]);
  });

  it('should refuse to put an element that is already at the workshop', async () => {
    givenWorkshop([mouleEnCoursFixture]);

    const resultat = await whenPuttingAtWorkshop('moule-1');

    expect(resultat).toEqual({ ok: false, error: new ElementDejaALAtelier() });
  });

  it('should refuse to put an element the referential does not know', async () => {
    givenWorkshop([]);

    const resultat = await whenPuttingAtWorkshop('inconnu');

    expect(resultat).toEqual({ ok: false, error: new ElementDeFabricationIntrouvable() });
  });

  it('should accept putting back an element whose previous run is closed', async () => {
    givenWorkshop([mouleClotureFixture]);

    const resultat = await whenPuttingAtWorkshop('moule-2');

    expect(resultat).toEqual({ ok: true, value: undefined });
    expect(await whenListing('ACTIFS')).toEqual([
      { suivi: 'suivi-cree-1', nom: 'PRD-2026-000002', type: 'PRODUIT', etat: 'EN_ATTENTE', cloture: undefined },
    ]);
  });

  it('should close an element so it leaves what is at the workshop', async () => {
    givenWorkshop([mouleEnCoursFixture]);

    const resultat = await whenClosing('suivi-1');

    expect(resultat).toEqual({ ok: true, value: undefined });
    expect(await whenListing('ACTIFS')).toEqual([]);
  });

  it('should refuse to close an element the workshop does not track', async () => {
    givenWorkshop([mouleEnCoursFixture]);

    const resultat = await whenClosing('suivi-inconnu');

    expect(resultat).toEqual({ ok: false, error: new SuiviIntrouvable() });
  });

  it('should reopen a closed element so it comes back to what is at the workshop', async () => {
    givenWorkshop([mouleClotureFixture]);

    const resultat = await whenReopening('suivi-3');

    expect(resultat).toEqual({ ok: true, value: undefined });
    expect(await whenListing('ACTIFS')).toEqual([
      { suivi: 'suivi-3', nom: 'PRD-2026-000002', type: 'PRODUIT', etat: 'EN_ATTENTE', cloture: undefined },
    ]);
  });

  it('should refuse to reopen an element the workshop does not track', async () => {
    givenWorkshop([mouleClotureFixture]);

    const resultat = await whenReopening('suivi-inconnu');

    expect(resultat).toEqual({ ok: false, error: new SuiviIntrouvable() });
  });

  const givenWorkshop = (suivis: readonly SuiviFixture[]): void => {
    harness.seed(suivis);
  };

  const whenReading = (filtre: 'ACTIFS' | 'CLOTURES'): Promise<Page<ElementALAtelier>> => port.elements(new RequeteAtelier(0, 20, filtre));

  const whenListing = async (filtre: 'ACTIFS' | 'CLOTURES'): Promise<ProjectionSuivi[]> => {
    const page = await whenReading(filtre);
    return page.elements.map(projeter);
  };

  const whenPuttingAtWorkshop = (element: string): Promise<Result<void, RefusMiseALAtelier>> =>
    port.mettreALAtelier(new ElementEngageId(element));

  const whenClosing = (suivi: string): Promise<Result<void, SuiviIntrouvable>> => port.cloturer(new SuiviId(suivi));

  const whenReopening = (suivi: string): Promise<Result<void, SuiviIntrouvable>> => port.rouvrir(new SuiviId(suivi));
});

describe('Beyond the contract: HttpAtelier', () => {
  let port: AtelierPort;
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
        HttpAtelier,
      ],
    });
    port = TestBed.inject(HttpAtelier);
    server = TestBed.inject(HttpTestingController);
    errorHandler = TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture;
  });

  afterEach(() => {
    server.verify();
  });

  it('should ask for the three open states and no period at all', async () => {
    const result = port.elements(new RequeteAtelier(0, 20, 'ACTIFS'));
    const request = await whenReadAnswers([]);

    await result;
    expect(request.request.params.getAll('etats')).toEqual(['EN_ATTENTE', 'EN_COURS', 'INTERROMPU']);
    expect(request.request.params.get('debut')).toBeNull();
    expect(request.request.params.get('fin')).toBeNull();
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('20');
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

  it('should report a technical read failure to ErrorHandlerPort and reject', async () => {
    const result = port.elements(new RequeteAtelier(0, 20, 'ACTIFS')).catch((failure: unknown) => failure);
    await whenReadFails();

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should reject a closed answer that omits who closed it', async () => {
    const result = port.elements(new RequeteAtelier(0, 20, 'CLOTURES')).catch((failure: unknown) => failure);
    await whenReadAnswers([clotureSansAuteurFixture]);

    expect(await result).toEqual(new Error('suivi.cloturePar manque dans la réponse du serveur'));
  });

  it.each([
    ['mettreALAtelier', 'POST', ROUTE, 409, 'element-deja-engage', new ElementDejaALAtelier()],
    ['mettreALAtelier', 'POST', ROUTE, 404, 'element-de-fabrication-introuvable', new ElementDeFabricationIntrouvable()],
    ['cloturer', 'PUT', `${ROUTE}/suivi-1/cloture`, 404, 'suivi-d-atelier-introuvable', new SuiviIntrouvable()],
    ['rouvrir', 'DELETE', `${ROUTE}/suivi-1/cloture`, 404, 'suivi-d-atelier-introuvable', new SuiviIntrouvable()],
  ] as const)('should translate the %s refusal into the domain', async (action, method, url, status, code, attendu) => {
    const result = whenCommandStarts(action);
    await whenWriteAnswers(method, url, status, { type: `${URN}${code}` });

    expect(await result).toEqual({ ok: false, error: attendu });
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

  const whenReadAnswers = async (suivis: readonly RestSuivi[]): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(candidate => candidate.method === 'GET' && candidate.url === ROUTE);
    request.flush({ content: suivis, currentPage: 0, pageSize: 20, totalElementsCount: suivis.length });
    return request;
  };

  const whenReadFails = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server.expectOne(candidate => candidate.method === 'GET' && candidate.url === ROUTE).flush({}, { status: 500, statusText: 'Failure' });
  };

  const whenWriteAnswers = async (method: string, url: string, status: number, body: object): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(candidate => candidate.method === method && candidate.url === url);
    request.flush(body, { status, statusText: 'Response' });
    return request;
  };
});
