import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Result } from '@/app/shared/result/domain/Result';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { ElementsDeFabricationFixture } from '@test/unit/fixtures/gestion/element-de-fabrication/ElementsDeFabricationFixture';
import { defer, Observable, of, switchMap, throwError } from 'rxjs';
import { CategorieDeProduit } from '../../domain/CategorieDeProduit';
import { CategorieInconnue } from '../../domain/CategorieInconnue';
import { CycleDuProduit } from '../../domain/CycleDuProduit';
import { ElementDeFabrication } from '../../domain/ElementDeFabrication';
import { ElementDeFabricationId } from '../../domain/ElementDeFabricationId';
import { ElementDeFabricationIntrouvable } from '../../domain/ElementDeFabricationIntrouvable';
import { ElementsDeFabricationPort } from '../../domain/ElementsDeFabricationPort';
import { LibelleDElement } from '../../domain/LibelleDElement';
import { NomDElement } from '../../domain/NomDElement';
import { ProduitDansSonCycle } from '../../domain/ProduitDansSonCycle';
import { ReferenceDElement } from '../../domain/ReferenceDElement';
import { ReferenceDejaUtilisee } from '../../domain/ReferenceDejaUtilisee';
import { RefusCreationElement } from '../../domain/RefusCreationElement';
import { RefusModificationElement } from '../../domain/RefusModificationElement';
import { RequeteProduits } from '../../domain/RequeteProduits';
import { HttpElementsDeFabrication } from './HttpElementsDeFabrication';

type RestElement = components['schemas']['RestElementDeFabrication'];
interface CorpsDeFiche {
  reference?: string;
  description?: string;
}

type ElementFixture = RestElement & { readonly id: string; readonly categorie: string; readonly nom: string };

const ROUTE = '/api/elements-de-fabrication';
const NOM_ATTRIBUE = 'PRD-2026-000001';
const CREE_LE = '2026-10-01T08:00:00Z';
const MIS_A_L_ATELIER_LE = '2026-10-02T08:00:00Z';
const CLOTURE_LE = '2026-10-05T16:00:00Z';

const mouleFixture: ElementFixture = {
  id: 'moule-1',
  categorie: 'MOULE',
  nom: 'PRD-2026-000001',
  reference: '1015',
  description: 'Moule de capot',
  dateDeCreation: CREE_LE,
  cycle: 'EN_PREPARATION',
};
const ofALAtelierFixture: ElementFixture = {
  id: 'of-1',
  categorie: 'OF',
  nom: 'OF-2026-000042',
  dateDeCreation: CREE_LE,
  cycle: 'EN_ATELIER',
  etatDAtelier: 'INTERROMPU',
  misALAtelierLe: MIS_A_L_ATELIER_LE,
};
const moulesClotureFixture: ElementFixture = {
  id: 'moule-2',
  categorie: 'MOULE',
  nom: 'MOULE-2026-000002',
  reference: 'M-2',
  dateDeCreation: CREE_LE,
  cycle: 'CLOTURE',
  misALAtelierLe: MIS_A_L_ATELIER_LE,
  clotureLe: CLOTURE_LE,
  clotureePar: 'Claire',
};

interface ProjectionElement {
  readonly id: string;
  readonly categorie: string;
  readonly nom: string;
  readonly reference: string | undefined;
  readonly libelle: string | undefined;
  readonly cycle: CycleDuProduit;
}

const projeter = (produit: ProduitDansSonCycle): ProjectionElement => ({
  id: produit.element.id.value,
  categorie: produit.element.categorie.value,
  nom: produit.element.nom.value,
  reference: produit.element.reference?.value,
  libelle: produit.element.libelle?.value,
  cycle: produit.passage.cycle,
});

const sansCasse = (texte: string | undefined): string => (texte ?? '').toLocaleLowerCase('fr-FR');

const trouve = (element: ElementFixture, recherche: string | null): boolean =>
  recherche === null
  || [element.nom, element.reference, element.description].some(texte => sansCasse(texte).includes(sansCasse(recherche)));

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
        return this.handlePost(url.pathname, request.body as CorpsDeFiche & { categorie: string });
      case 'PUT':
        return this.handlePut(url.pathname, request.body as CorpsDeFiche);
      default:
        return new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    }
  }

  private handleGet(pathname: string, searchParams: URLSearchParams): HttpResponse<unknown> | HttpErrorResponse {
    switch (pathname) {
      case ROUTE:
        return this.page(searchParams);
      case `${ROUTE}/compteurs`:
        return this.compteurs(searchParams);
      default:
        return new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    }
  }

  private filtres(searchParams: URLSearchParams): ElementFixture[] {
    const categorie = searchParams.get('categorie');
    return this.elements.filter(
      element => (categorie === null || element.categorie === categorie) && trouve(element, searchParams.get('recherche')),
    );
  }

  private page(searchParams: URLSearchParams): HttpResponse<unknown> {
    const page = Number(searchParams.get('page') ?? '0');
    const size = Number(searchParams.get('size') ?? '20');
    const trouves = this.filtres(searchParams).filter(element => (searchParams.get('cycle') ?? undefined) === element.cycle);
    return pageOf(trouves, page, size);
  }

  private compteurs(searchParams: URLSearchParams): HttpResponse<unknown> {
    const trouves = this.filtres(searchParams);
    const compter = (cycle: string): number => trouves.filter(element => element.cycle === cycle).length;
    return new HttpResponse({
      status: 200,
      body: { enPreparation: compter('EN_PREPARATION'), enAtelier: compter('EN_ATELIER'), clotures: compter('CLOTURE') },
    });
  }

  private handlePost(pathname: string, body: CorpsDeFiche & { categorie: string }): HttpResponse<unknown> | HttpErrorResponse {
    if (pathname !== ROUTE) {
      return new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    }
    const created: ElementFixture = {
      id: 'created-element',
      categorie: body.categorie,
      nom: NOM_ATTRIBUE,
      dateDeCreation: CREE_LE,
      cycle: 'EN_PREPARATION',
      ...ficheOf(body),
    };
    this.elements = [...this.elements, created];
    return new HttpResponse({ status: 201, body: created });
  }

  private handlePut(pathname: string, body: CorpsDeFiche): HttpResponse<unknown> | HttpErrorResponse {
    if (!pathname.startsWith(`${ROUTE}/`)) {
      return new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    }
    const id = pathname.substring(`${ROUTE}/`.length);
    this.elements = this.elements.map(element => (element.id === id ? { ...sansFiche(element), ...ficheOf(body) } : element));
    return new HttpResponse({ status: 200, body: this.elements.find(element => element.id === id) ?? null });
  }
}

const sansFiche = (element: ElementFixture): ElementFixture => ({
  id: element.id,
  categorie: element.categorie,
  nom: element.nom,
  ...Object.fromEntries(Object.entries(element).filter(([cle]) => !['reference', 'description'].includes(cle))),
});

const pageOf = (entries: readonly object[], page: number, size: number): HttpResponse<unknown> =>
  new HttpResponse({
    status: 200,
    body: { content: entries.slice(page * size, (page + 1) * size), currentPage: page, pageSize: size, totalElementsCount: entries.length },
  });

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

const passageDe = (element: ElementFixture): ProduitDansSonCycle['passage'] => {
  switch (element.cycle) {
    case 'EN_ATELIER':
      return { cycle: 'EN_ATELIER', etat: element.etatDAtelier ?? 'EN_ATTENTE', misALAtelierLe: new Date(MIS_A_L_ATELIER_LE) };
    case 'CLOTURE':
      return {
        cycle: 'CLOTURE',
        misALAtelierLe: new Date(MIS_A_L_ATELIER_LE),
        clotureLe: new Date(CLOTURE_LE),
        clotureePar: element.clotureePar ?? '',
      };
    default:
      return { cycle: 'EN_PREPARATION' };
  }
};

const toDomain = (element: ElementFixture): ProduitDansSonCycle =>
  new ProduitDansSonCycle(
    new ElementDeFabrication(new ElementDeFabricationId(element.id), {
      categorie: new CategorieDeProduit(element.categorie),
      nom: new NomDElement(element.nom),
      reference: element.reference === undefined ? undefined : new ReferenceDElement(element.reference),
      libelle: element.description === undefined ? undefined : new LibelleDElement(element.description),
    }),
    new Date(CREE_LE),
    passageDe(element),
  );

const createFixtureHarness = (): ElementsHarness => {
  const fixture = new ElementsDeFabricationFixture();
  return {
    port: fixture,
    seed: (elements: readonly ElementFixture[]) => {
      fixture.produitsEnregistres = elements.map(toDomain);
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

  it.each([
    ['EN_PREPARATION', 'moule-1'],
    ['EN_ATELIER', 'of-1'],
    ['CLOTURE', 'moule-2'],
  ] as const)('should read only the products of the %s cycle', async (cycle, id) => {
    givenReferential([mouleFixture, ofALAtelierFixture, moulesClotureFixture]);

    const page = await whenReading(cycle);

    expect(page.totalCount).toBe(1);
    expect(page.elements.map(produit => produit.element.id.value)).toEqual([id]);
  });

  it('should tell where a product in the workshop stands and since when', async () => {
    givenReferential([ofALAtelierFixture]);

    const [produit] = (await whenReading('EN_ATELIER')).elements;

    expect(produit?.creeLe).toEqual(new Date(CREE_LE));
    expect(produit?.passage).toEqual({ cycle: 'EN_ATELIER', etat: 'INTERROMPU', misALAtelierLe: new Date(MIS_A_L_ATELIER_LE) });
  });

  it('should tell when and by whom a closed product was closed', async () => {
    givenReferential([moulesClotureFixture]);

    const [produit] = (await whenReading('CLOTURE')).elements;

    expect(produit?.passage).toEqual({
      cycle: 'CLOTURE',
      misALAtelierLe: new Date(MIS_A_L_ATELIER_LE),
      clotureLe: new Date(CLOTURE_LE),
      clotureePar: 'Claire',
    });
  });

  it('should keep the products of the requested category only', async () => {
    givenReferential([mouleFixture, { ...ofALAtelierFixture, cycle: 'EN_PREPARATION' }]);

    const page = await whenReading('EN_PREPARATION', 'OF');

    expect(page.elements.map(projeter)).toEqual([
      { id: 'of-1', categorie: 'OF', nom: 'OF-2026-000042', reference: undefined, libelle: undefined, cycle: 'EN_PREPARATION' },
    ]);
  });

  it.each(['CAPOT', '1015', 'prd-2026'])('should find a product by %s, whatever the case', async recherche => {
    givenReferential([mouleFixture, { ...ofALAtelierFixture, cycle: 'EN_PREPARATION' }]);

    const page = await whenReading('EN_PREPARATION', undefined, recherche);

    expect(page.elements.map(produit => produit.element.id.value)).toEqual(['moule-1']);
  });

  it('should slice the products of a cycle twenty at a time', async () => {
    givenManyElements(25);

    const page = await whenReading('EN_PREPARATION', undefined, '', 1);

    expect(page.totalCount).toBe(25);
    expect(page.elements.map(produit => produit.element.id.value)).toEqual(['e-20', 'e-21', 'e-22', 'e-23', 'e-24']);
  });

  it('should count the products of each cycle', async () => {
    givenReferential([mouleFixture, ofALAtelierFixture, moulesClotureFixture, { ...ofALAtelierFixture, id: 'of-3' }]);

    const compteurs = await whenCounting();

    expect(compteurs).toEqual({ EN_PREPARATION: 1, EN_ATELIER: 2, CLOTURE: 1 });
  });

  it('should count only the products of the category and the search', async () => {
    givenReferential([mouleFixture, ofALAtelierFixture, moulesClotureFixture]);

    const compteurs = await whenCounting('MOULE', 'capot');

    expect(compteurs).toEqual({ EN_PREPARATION: 1, EN_ATELIER: 0, CLOTURE: 0 });
  });

  it('should return an empty page for an empty cycle', async () => {
    givenReferential([]);

    const page = await whenReading('CLOTURE');

    expect(page.totalCount).toBe(0);
    expect(page.elements).toEqual([]);
  });

  it.each([
    ['with a company number and a label', '1015', 'Moule de capot'],
    ['reduced to its produced number', undefined, undefined],
  ] as const)('should create an element %s and list it in preparation', async (_scenario, reference, libelle) => {
    const resultat = await whenCreating('MOULE', reference, libelle);

    expect(resultat).toEqual({ ok: true, value: undefined });
    expect(await whenListing()).toEqual([
      { id: 'created-element', categorie: 'MOULE', nom: NOM_ATTRIBUE, reference, libelle, cycle: 'EN_PREPARATION' },
    ]);
  });

  it('should create an ordre de fabrication carrying its own category', async () => {
    const resultat = await whenCreating('OF', '1016', undefined);

    expect(resultat).toEqual({ ok: true, value: undefined });
    expect(await whenListing()).toEqual([
      { id: 'created-element', categorie: 'OF', nom: NOM_ATTRIBUE, reference: '1016', libelle: undefined, cycle: 'EN_PREPARATION' },
    ]);
  });

  it('should update the company number and the label of an existing element', async () => {
    givenReferential([mouleFixture]);

    const resultat = await whenModifying('moule-1', '1016', 'Moule de portière');

    expect(resultat).toEqual({ ok: true, value: undefined });
    expect(await whenListing()).toEqual([
      {
        id: 'moule-1',
        categorie: 'MOULE',
        nom: 'PRD-2026-000001',
        reference: '1016',
        libelle: 'Moule de portière',
        cycle: 'EN_PREPARATION',
      },
    ]);
  });

  it('should remove the company number and the label of an existing element', async () => {
    givenReferential([mouleFixture]);

    const resultat = await whenModifying('moule-1', undefined, undefined);

    expect(resultat).toEqual({ ok: true, value: undefined });
    expect(await whenListing()).toEqual([
      { id: 'moule-1', categorie: 'MOULE', nom: 'PRD-2026-000001', reference: undefined, libelle: undefined, cycle: 'EN_PREPARATION' },
    ]);
  });

  const givenReferential = (elements: readonly ElementFixture[]): void => {
    harness.seed(elements);
  };

  const givenManyElements = (count: number): void => {
    harness.seed(
      Array.from({ length: count }, (_, index) => ({
        id: `e-${index}`,
        categorie: 'MOULE',
        nom: `PRD-2026-${String(index).padStart(6, '0')}`,
        dateDeCreation: CREE_LE,
        cycle: 'EN_PREPARATION' as const,
      })),
    );
  };

  const whenReading = (cycle: CycleDuProduit, categorie?: string, recherche = '', page = 0) =>
    port.produits(
      new RequeteProduits({
        cycle,
        categorie: categorie === undefined ? undefined : new CategorieDeProduit(categorie),
        recherche,
        page,
      }),
    );

  const whenCounting = (categorie?: string, recherche = '') =>
    port.compteurs(
      new RequeteProduits({
        cycle: 'EN_ATELIER',
        categorie: categorie === undefined ? undefined : new CategorieDeProduit(categorie),
        recherche,
        page: 0,
      }),
    );

  const whenListing = async (): Promise<ProjectionElement[]> => {
    const page = await whenReading('EN_PREPARATION');
    return page.elements.map(projeter);
  };

  const whenCreating = (
    code: string,
    reference: string | undefined,
    libelle: string | undefined,
  ): Promise<Result<void, RefusCreationElement>> =>
    port.creer({
      kind: 'CREATION',
      categorie: new CategorieDeProduit(code),
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

const sans = (element: RestElement, champ: keyof RestElement): RestElement =>
  Object.fromEntries(Object.entries(element).filter(([cle]) => cle !== champ));

const preparationFixture: RestElement = { ...mouleFixture };
const atelierFixture: RestElement = { ...ofALAtelierFixture };
const clotureFixture: RestElement = { ...moulesClotureFixture };

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

  it('should send the cycle, the category, the search and the page, without any creation period', async () => {
    const result = port.produits(
      new RequeteProduits({ cycle: 'CLOTURE', categorie: new CategorieDeProduit('MOULE'), recherche: ' capot ', page: 2 }),
    );
    const request = await whenReadAnswers([], 2);

    await result;
    expect(parametres(request)).toEqual({ cycle: 'CLOTURE', categorie: 'MOULE', recherche: 'capot', page: '2', size: '20' });
  });

  it('should send neither a category nor a search the manager did not give', async () => {
    const result = port.produits(new RequeteProduits({ cycle: 'EN_ATELIER', categorie: undefined, recherche: '   ', page: 0 }));
    const request = await whenReadAnswers([]);

    await result;
    expect(parametres(request)).toEqual({ cycle: 'EN_ATELIER', page: '0', size: '20' });
  });

  it('should count with the category and the search only', async () => {
    const result = port.compteurs(
      new RequeteProduits({ cycle: 'CLOTURE', categorie: new CategorieDeProduit('OF'), recherche: 'capot', page: 3 }),
    );
    const request = await whenCountersAnswer();

    await result;
    expect(parametres(request)).toEqual({ categorie: 'OF', recherche: 'capot' });
  });

  it('should report a failed count once and reject', async () => {
    const result = port
      .compteurs(new RequeteProduits({ cycle: 'EN_ATELIER', categorie: undefined, recherche: '', page: 0 }))
      .catch((failure: unknown) => failure);
    await whenCountersFail();

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should report a technical read failure to ErrorHandlerPort and reject', async () => {
    const result = port
      .produits(new RequeteProduits({ cycle: 'EN_ATELIER', categorie: undefined, recherche: '', page: 0 }))
      .catch((failure: unknown) => failure);
    await whenReadFails();

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
    expect(errorHandler.errors[0]).toBeInstanceOf(HttpErrorResponse);
  });

  it.each([
    ['element.id', sans(preparationFixture, 'id')],
    ['element.nom', sans(preparationFixture, 'nom')],
    ['element.categorie', sans(preparationFixture, 'categorie')],
    ['element.cycle', sans(preparationFixture, 'cycle')],
    ['element.dateDeCreation', sans(preparationFixture, 'dateDeCreation')],
    ['element.etatDAtelier', sans(atelierFixture, 'etatDAtelier')],
    ['element.misALAtelierLe', sans(atelierFixture, 'misALAtelierLe')],
    ['element.misALAtelierLe', sans(clotureFixture, 'misALAtelierLe')],
    ['element.clotureLe', sans(clotureFixture, 'clotureLe')],
    ['element.clotureePar', sans(clotureFixture, 'clotureePar')],
  ])('should reject a server answer missing %s', async (champ, element) => {
    const result = port
      .produits(new RequeteProduits({ cycle: 'EN_ATELIER', categorie: undefined, recherche: '', page: 0 }))
      .catch((failure: unknown) => failure);
    await whenReadAnswers([element]);

    expect(await result).toEqual(new Error(`${champ} manque dans la réponse du serveur`));
  });

  it.each([
    ['creer', ROUTE, 409, 'reference-deja-utilisee', new ReferenceDejaUtilisee()],
    ['creer', ROUTE, 409, 'categorie-inconnue', new CategorieInconnue()],
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
    const result = port.creer({ kind: 'CREATION', categorie: new CategorieDeProduit('OF'), reference: undefined, libelle: undefined });
    const request = await whenWriteAnswers(ROUTE, 201, {});

    await result;
    expect(request.request.body).toEqual({ categorie: 'OF' });
  });

  const whenCommandStarts = (action: 'creer' | 'modifier') => {
    switch (action) {
      case 'creer':
        return port.creer({
          kind: 'CREATION',
          categorie: new CategorieDeProduit('MOULE'),
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

  const whenReadAnswers = async (elements: readonly RestElement[], page = 0): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(candidate => candidate.method === 'GET' && candidate.url === ROUTE);
    request.flush({ content: elements, currentPage: page, pageSize: 20, totalElementsCount: elements.length });
    return request;
  };

  const whenReadFails = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server.expectOne(candidate => candidate.method === 'GET' && candidate.url === ROUTE).flush({}, { status: 500, statusText: 'Failure' });
  };

  const whenCountersAnswer = async (): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(candidate => candidate.url === `${ROUTE}/compteurs`);
    request.flush({ enPreparation: 0, enAtelier: 0, clotures: 0 });
    return request;
  };

  const whenCountersFail = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server.expectOne(candidate => candidate.url === `${ROUTE}/compteurs`).flush({}, { status: 500, statusText: 'Failure' });
  };

  const parametres = (request: TestRequest): Record<string, string | null> =>
    Object.fromEntries(request.request.params.keys().map(key => [key, request.request.params.get(key)]));

  const whenWriteAnswers = async (url: string, status: number, body: object | null): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(url);
    request.flush(body, { status, statusText: 'Response' });
    return request;
  };
});
