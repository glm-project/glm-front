import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { CoutDeRevientFixture } from '@test/unit/fixtures/gestion/cout-de-revient/CoutDeRevientFixture';
import { defer, Observable, of, switchMap, throwError } from 'rxjs';
import { ElementChiffre } from '../../domain/element/ElementChiffre';
import { ElementChiffreId } from '../../domain/element/ElementChiffreId';
import { ElementDisponible } from '../../domain/element/ElementDisponible';
import { Cout } from '../../domain/montant/Cout';
import { Montant } from '../../domain/montant/Montant';
import { TotalDeMontant } from '../../domain/montant/TotalDeMontant';
import { ActiviteCitee } from '../../domain/pointage/ActiviteCitee';
import { ElementCite } from '../../domain/pointage/ElementCite';
import { OperateurCite } from '../../domain/pointage/OperateurCite';
import { PartDePointage } from '../../domain/pointage/PartDePointage';
import { PointageEnConflit } from '../../domain/pointage/PointageEnConflit';
import { PosteCite } from '../../domain/pointage/PosteCite';
import { ActivitesEnCoursExclues } from '../../domain/rapport/ActivitesEnCoursExclues';
import { CoutDeRevient } from '../../domain/rapport/CoutDeRevient';
import { CoutDeRevientPort } from '../../domain/rapport/CoutDeRevientPort';
import { LigneDeCout } from '../../domain/rapport/LigneDeCout';
import { NatureDOperation } from '../../domain/rapport/NatureDOperation';
import { DureePassee } from '../../domain/temps/DureePassee';
import { InstantDeTravail } from '../../domain/temps/InstantDeTravail';
import { TempsPasse } from '../../domain/temps/TempsPasse';
import { TotalDeTemps } from '../../domain/temps/TotalDeTemps';
import { HttpCoutDeRevient } from './HttpCoutDeRevient';

type RestRapport = components['schemas']['RestCoutDeRevient'];
type RestLigne = components['schemas']['RestLigneDeCout'];

const ROUTE = '/api/couts-de-revient';
const ELEMENT = '4f8d1e0a-1111-2222-3333-444455556666';
const DEMANDE = new ElementChiffreId(ELEMENT);

interface LigneFixture {
  readonly nature: string | undefined;
  readonly travail: string;
  readonly nonConformite: string;
  readonly machine: number;
  readonly mainDOeuvre: number;
  readonly reprises: readonly [string, string][];
}

const fraisageFixture: LigneFixture = {
  nature: 'Fraisage',
  travail: 'PT2H',
  nonConformite: 'PT0S',
  machine: 90,
  mainDOeuvre: 40,
  reprises: [],
};

const tournageFixture: LigneFixture = {
  nature: 'Tournage',
  travail: 'PT1H',
  nonConformite: 'PT0S',
  machine: 60,
  mainDOeuvre: 10,
  reprises: [],
};

const sansPosteFixture: LigneFixture = {
  nature: undefined,
  travail: 'PT1H',
  nonConformite: 'PT0S',
  machine: 0,
  mainDOeuvre: 20,
  reprises: [],
};

const PERIODE = { debut: '2026-05-11T09:00:00Z', fin: '2026-05-11T11:00:00Z' };
const TOTAL = { travail: 'PT2H', nonConformite: 'PT30M', total: 'PT2H30M' };
const COUT_TOTAL = { machine: 90, mainDOeuvre: 40, total: 130 };

const completFixture = <T>(valeur: T): { complete: true; valeur: T } => ({ complete: true, valeur });

const toRestLigne = (ligne: LigneFixture): RestLigne => ({
  ...(ligne.nature === undefined ? {} : { nature: ligne.nature }),
  periode: PERIODE,
  temps: {
    travail: completFixture(ligne.travail),
    nonConformite: completFixture(ligne.nonConformite),
    total: completFixture(ligne.travail),
  },
  finsAutomatiques: [],
  nonConformites: ligne.reprises.map(([debut, fin]) => ({ debut, fin })),
  cout: {
    machine: completFixture(ligne.machine),
    mainDOeuvre: completFixture(ligne.mainDOeuvre),
    total: completFixture(ligne.machine + ligne.mainDOeuvre),
  },
  pointages: [],
});

const toRest = (lignes: readonly LigneFixture[]): RestRapport => ({
  element: { id: ELEMENT, nom: 'OF-2026-000001', type: 'ORDRE_DE_FABRICATION' },
  lignes: lignes.map(toRestLigne),
  temps: { travail: completFixture(TOTAL.travail), nonConformite: completFixture(TOTAL.nonConformite), total: completFixture(TOTAL.total) },
  cout: {
    machine: completFixture(COUT_TOTAL.machine),
    mainDOeuvre: completFixture(COUT_TOTAL.mainDOeuvre),
    total: completFixture(COUT_TOTAL.total),
  },
  evaluation: '2026-05-11T12:00:00Z',
  activitesEnCours: 0,
  conflits: [],
});

const toDomainLigne = (ligne: LigneFixture): LigneDeCout =>
  new LigneDeCout({
    nature: ligne.nature === undefined ? undefined : new NatureDOperation(ligne.nature),
    temps: new TempsPasse(
      TotalDeTemps.complet(new DureePassee(ligne.travail)),
      TotalDeTemps.complet(new DureePassee(ligne.nonConformite)),
      TotalDeTemps.complet(new DureePassee(ligne.travail)),
    ),
    cout: new Cout(
      TotalDeMontant.complet(new Montant(ligne.machine)),
      TotalDeMontant.complet(new Montant(ligne.mainDOeuvre)),
      TotalDeMontant.complet(new Montant(ligne.machine + ligne.mainDOeuvre)),
    ),
    pointages: [],
  });

const toDomain = (lignes: readonly LigneFixture[]): CoutDeRevient =>
  new CoutDeRevient(new ElementChiffre('OF-2026-000001', 'ORDRE_DE_FABRICATION'), {
    lignes: lignes.map(toDomainLigne),
    evaluation: new InstantDeTravail('2026-05-11T12:00:00Z'),
    activitesEnCours: new ActivitesEnCoursExclues(0),
    temps: new TempsPasse(
      TotalDeTemps.complet(new DureePassee(TOTAL.travail)),
      TotalDeTemps.complet(new DureePassee(TOTAL.nonConformite)),
      TotalDeTemps.complet(new DureePassee(TOTAL.total)),
    ),
    cout: new Cout(
      TotalDeMontant.complet(new Montant(COUT_TOTAL.machine)),
      TotalDeMontant.complet(new Montant(COUT_TOTAL.mainDOeuvre)),
      TotalDeMontant.complet(new Montant(COUT_TOTAL.total)),
    ),
  });

const sansChampDuRapport = (rapport: RestRapport, champ: keyof RestRapport): RestRapport =>
  Object.fromEntries(Object.entries(rapport).filter(([cle]) => cle !== champ)) as RestRapport;

const sansChampDeLigne = (ligne: RestLigne, champ: keyof RestLigne): RestLigne =>
  Object.fromEntries(Object.entries(ligne).filter(([cle]) => cle !== champ)) as RestLigne;

const premiereLigneDe = (rapport: RestRapport): RestLigne => {
  const ligne = rapport.lignes?.[0];
  if (ligne === undefined) {
    throw new Error('Le rapport de scénario ne porte aucune ligne');
  }
  return ligne;
};

const projeterLigne = (ligne: LigneDeCout): Record<string, unknown> => ({
  nature: ligne.nature?.value,
  travail: ligne.temps.travail.snapshot(),
  nonConformite: ligne.temps.nonConformite.snapshot(),
  machine: ligne.cout.machine.snapshot(),
  mainDOeuvre: ligne.cout.mainDOeuvre.snapshot(),
});

class CoutDeRevientHttpBackendFixture implements HttpBackend {
  lignes: readonly LigneFixture[] = [];
  elementInconnu = false;
  elements: readonly ElementDisponible[] = [];
  collectionFailure = false;

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    if (request.url === '/api/elements-de-fabrication') {
      return defer(async () => {
        if (this.collectionFailure) {
          await new Promise(resolve => setTimeout(resolve));
          return new HttpErrorResponse({ status: 500, error: {} });
        }
        await new Promise(resolve => setTimeout(resolve));
        return new HttpResponse({
          status: 200,
          body: {
            content: this.elements.map(element => ({ id: element.id.value, nom: element.identite.nom, type: element.identite.type })),
            currentPage: 0,
            pageSize: 100,
            totalElementsCount: this.elements.length,
          },
        });
      }).pipe(switchMap(answer => (answer instanceof HttpErrorResponse ? throwError(() => answer) : of(answer))));
    }
    return defer(() => this.answer()).pipe(
      switchMap(answer => (answer instanceof HttpErrorResponse ? throwError(() => answer) : of(answer))),
    );
  }

  private async answer(): Promise<HttpResponse<unknown> | HttpErrorResponse> {
    await new Promise(resolve => setTimeout(resolve));
    if (this.elementInconnu) {
      return new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        error: { title: 'element de fabrication introuvable' },
      });
    }
    return new HttpResponse({ status: 200, body: toRest(this.lignes) });
  }
}

interface CoutDeRevientHarness {
  readonly port: CoutDeRevientPort;
  seed(lignes: readonly LigneFixture[]): void;
  seedElementInconnu(): void;
  seedElements(elements: readonly ElementDisponible[]): void;
  failCollection(): void;
}

const createHttpHarness = (): CoutDeRevientHarness => {
  const backend = new CoutDeRevientHttpBackendFixture();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      { provide: HttpBackend, useValue: backend },
      ApiClient,
      { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      HttpCoutDeRevient,
    ],
  });
  return {
    port: TestBed.inject(HttpCoutDeRevient),
    seed: (lignes: readonly LigneFixture[]) => {
      backend.lignes = [...lignes];
    },
    failCollection: () => {
      backend.collectionFailure = true;
    },
    seedElements: elements => {
      backend.collectionFailure = false;
      backend.elements = elements;
    },
    seedElementInconnu: () => {
      backend.elementInconnu = true;
    },
  };
};

const createFixtureHarness = (): CoutDeRevientHarness => {
  const fixture = new CoutDeRevientFixture();
  return {
    port: fixture,
    seed: (lignes: readonly LigneFixture[]) => {
      fixture.rapports.set(ELEMENT, toDomain(lignes));
    },
    failCollection: () => {
      fixture.collectionFailure = new Error('Collection fixture failure');
    },
    seedElements: elements => {
      fixture.collectionFailure = undefined;
      fixture.elements = elements;
    },
    seedElementInconnu: () => {
      fixture.elementsInconnus.add(ELEMENT);
    },
  };
};

const adapters: [string, () => CoutDeRevientHarness][] = [
  ['HttpCoutDeRevient', createHttpHarness],
  ['CoutDeRevientFixture', createFixtureHarness],
];

describe.each(adapters)('CoutDeRevientPort contract, honoured by %s', (_adapter, createHarness) => {
  let harness: CoutDeRevientHarness;
  let port: CoutDeRevientPort;

  beforeEach(() => {
    harness = createHarness();
    port = harness.port;
  });

  it('should return an empty collection when no element is available', async () => {
    const elements = await port.elementsDisponibles();

    expect(elements).toEqual([]);
  });

  it('should return the opaque identities and both types available for navigation', async () => {
    const elements: readonly ElementDisponible[] = [
      { id: new ElementChiffreId('of'), identite: new ElementChiffre('OF A', 'ORDRE_DE_FABRICATION') },
      { id: new ElementChiffreId('moule'), identite: new ElementChiffre('Moule B', 'PRODUIT') },
    ];
    harness.seedElements(elements);

    const available = await port.elementsDisponibles();

    expect(available).toEqual(elements);
  });

  it('should reject an unavailable choice collection independently of the report and allow a full retry', async () => {
    givenRapport([fraisageFixture]);
    harness.failCollection();

    const failure = await port.elementsDisponibles().catch((error: unknown) => error);
    const rapport = await port.rapport(DEMANDE);
    harness.seedElements([]);
    const retried = await port.elementsDisponibles();

    expect(failure).toHaveProperty('message');
    expect(rapport?.element.nom).toBe('OF-2026-000001');
    expect(retried).toEqual([]);
  });

  it('should return the element the report resolved', async () => {
    givenRapport([fraisageFixture]);

    const rapport = await port.rapport(DEMANDE);

    expect(rapport?.element).toMatchObject({ nom: 'OF-2026-000001', type: 'ORDRE_DE_FABRICATION' });
  });

  it('should return one line per operation nature, valued in machine and labour', async () => {
    givenRapport([fraisageFixture]);

    const rapport = await port.rapport(DEMANDE);

    expect(rapport?.lignes.map(projeterLigne)).toEqual([
      {
        nature: 'Fraisage',
        travail: { complete: true, valeur: new DureePassee('PT2H') },
        nonConformite: { complete: true, valeur: new DureePassee('PT0S') },
        machine: { complete: true, valeur: new Montant(90) },
        mainDOeuvre: { complete: true, valeur: new Montant(40) },
      },
    ]);
  });

  it('should return the lines in the order the server sent them', async () => {
    givenRapport([fraisageFixture, tournageFixture]);

    const rapport = await port.rapport(DEMANDE);

    expect(rapport?.lignes.map(ligne => ligne.nature?.value)).toEqual(['Fraisage', 'Tournage']);
  });

  it('should return a line clocked without a work station as carrying no trade', async () => {
    givenRapport([sansPosteFixture]);

    const rapport = await port.rapport(DEMANDE);

    expect(rapport?.lignes[0]?.estSansPoste()).toBe(true);
  });

  it('should return the totals the server computed', async () => {
    givenRapport([fraisageFixture, tournageFixture]);

    const rapport = await port.rapport(DEMANDE);

    expect([rapport?.temps.total.snapshot(), rapport?.cout.total.snapshot()]).toEqual([
      { complete: true, valeur: new DureePassee('PT2H30M') },
      { complete: true, valeur: new Montant(130) },
    ]);
  });

  it('should return an element nobody has clocked on yet as carrying no work', async () => {
    givenRapport([]);

    const rapport = await port.rapport(DEMANDE);

    expect(rapport?.estSansTravail()).toBe(true);
  });

  it('should answer nothing for an element the referential does not know', async () => {
    givenElementInconnu();

    const rapport = await port.rapport(DEMANDE);

    expect(rapport).toBeUndefined();
  });

  const givenRapport = (lignes: readonly LigneFixture[]): void => {
    harness.seed(lignes);
  };

  const givenElementInconnu = (): void => {
    harness.seedElementInconnu();
  };
});

describe('Beyond the contract: HttpCoutDeRevient', () => {
  let port: CoutDeRevientPort;
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
        HttpCoutDeRevient,
      ],
    });
    port = TestBed.inject(HttpCoutDeRevient);
    server = TestBed.inject(HttpTestingController);
    errorHandler = TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture;
  });

  afterEach(() => {
    server.verify();
  });

  it.each([
    { pageSize: 1, totalElementsCount: 2, names: ['b'] },
    { pageSize: 1, totalElementsCount: 4, names: ['b'] },
    { pageSize: 2, totalElementsCount: 3, names: ['b', 'c'] },
  ])('should reject pagination changing between pages %j', async following => {
    const result = port.elementsDisponibles().catch((failure: unknown) => failure);
    whenCollectionAnswers({
      content: [{ id: 'a', nom: 'OF A', type: 'ORDRE_DE_FABRICATION' }],
      currentPage: 0,
      pageSize: 1,
      totalElementsCount: 3,
    });
    await whenNextPageStarts();
    whenCollectionAnswers({
      content: following.names.map(id => ({ id, nom: id, type: 'PRODUIT' })),
      currentPage: 1,
      pageSize: following.pageSize,
      totalElementsCount: following.totalElementsCount,
    });
    await whenNextPageStarts();
    whenOutstandingCollectionFails();

    expect(await result).toEqual(new Error('Pagination instable de la collection'));
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should accept a stable effective page size capped below the requested size', async () => {
    const result = port.elementsDisponibles();
    whenCollectionAnswers({
      content: [
        { id: 'a', nom: 'A', type: 'PRODUIT' },
        { id: 'b', nom: 'B', type: 'ORDRE_DE_FABRICATION' },
      ],
      currentPage: 0,
      pageSize: 2,
      totalElementsCount: 3,
    });
    await whenNextPageStarts();
    whenCollectionAnswers({ content: [{ id: 'c', nom: 'C', type: 'PRODUIT' }], currentPage: 1, pageSize: 2, totalElementsCount: 3 });

    expect((await result).map(element => element.id.value)).toEqual(['a', 'b', 'c']);
  });

  it.each(['id', 'nom', 'type'])('should reject an unavailable identity field %s without dropping that choice', async field => {
    const identity = Object.fromEntries(Object.entries({ id: 'a', nom: 'A', type: 'PRODUIT' }).filter(([name]) => name !== field));
    const result = port.elementsDisponibles().catch((failure: unknown) => failure);
    whenCollectionAnswers({ content: [identity], currentPage: 0, pageSize: 100, totalElementsCount: 1 });

    expect(await result).toEqual(new Error(`element.${field} manque dans la réponse du serveur`));
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should treat a collection 404 as a technical failure and report it once', async () => {
    const result = port.elementsDisponibles().catch((failure: unknown) => failure);
    whenCollectionFails(404);

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should restart at the first page after a later page fails', async () => {
    const first = port.elementsDisponibles().catch((failure: unknown) => failure);
    whenCollectionAnswers({ content: [{ id: 'a', nom: 'A', type: 'PRODUIT' }], currentPage: 0, pageSize: 1, totalElementsCount: 2 });
    await whenNextPageStarts();
    whenCollectionFails(500);
    const failure = await first;
    const retry = port.elementsDisponibles();
    whenCollectionAnswers({ content: [{ id: 'a', nom: 'A', type: 'PRODUIT' }], currentPage: 0, pageSize: 1, totalElementsCount: 2 });
    await whenNextPageStarts();
    whenCollectionAnswers({ content: [{ id: 'b', nom: 'B', type: 'PRODUIT' }], currentPage: 1, pageSize: 1, totalElementsCount: 2 });
    const elements = await retry;

    expect(failure).toBeInstanceOf(HttpErrorResponse);
    expect(elements.map(element => element.id.value)).toEqual(['a', 'b']);
    expect(errorHandler.errors).toHaveLength(1);
  });

  const whenCollectionFails = (status: number): void => {
    server.expectOne(candidate => candidate.url === '/api/elements-de-fabrication').flush({}, { status, statusText: 'Failure' });
  };

  it('should reject an unfilled nonfinal page without waiting for more choices', async () => {
    const result = port.elementsDisponibles().catch((failure: unknown) => failure);
    whenCollectionAnswers({
      content: [{ id: 'a', nom: 'OF A', type: 'ORDRE_DE_FABRICATION' }],
      currentPage: 0,
      pageSize: 100,
      totalElementsCount: 101,
    });
    await whenNextPageStarts();
    whenOutstandingCollectionFails();

    expect(await result).toEqual(new Error('Collection incomplète'));
    expect(errorHandler.errors).toHaveLength(1);
  });

  const whenOutstandingCollectionFails = (): void => {
    server
      .match(candidate => candidate.url === '/api/elements-de-fabrication')
      .forEach(request => {
        request.flush({}, { status: 500, statusText: 'Failure' });
      });
  };

  it.each([
    { currentPage: -1 },
    { currentPage: 0.5 },
    { currentPage: 1 },
    { pageSize: 0 },
    { pageSize: -1 },
    { pageSize: 0.5 },
    { totalElementsCount: -1 },
    { totalElementsCount: 0.5 },
    { totalElementsCount: 0 },
    { pageSize: 1, totalElementsCount: 3 },
  ])('should reject inconsistent pagination metadata %j', async metadata => {
    const result = port.elementsDisponibles().catch((failure: unknown) => failure);
    whenCollectionAnswers(
      {
        content: [
          { id: 'a', nom: 'OF A', type: 'ORDRE_DE_FABRICATION' },
          { id: 'b', nom: 'Moule B', type: 'PRODUIT' },
        ],
        currentPage: 0,
        pageSize: 100,
        totalElementsCount: 2,
        ...metadata,
      },
      false,
    );

    expect(await result).toBeInstanceOf(Error);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should reject a duplicated identity instead of presenting a partial collection', async () => {
    const result = port.elementsDisponibles().catch((failure: unknown) => failure);
    whenCollectionAnswers({
      content: [
        { id: 'same', nom: 'OF A', type: 'ORDRE_DE_FABRICATION' },
        { id: 'same', nom: 'Moule B', type: 'PRODUIT' },
      ],
      currentPage: 0,
      pageSize: 100,
      totalElementsCount: 2,
    });

    expect(await result).toBeInstanceOf(Error);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should acquire every page with constant creation bounds before returning navigation choices', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `element-${String(index)}`,
      nom: `OF ${String(index)}`,
      type: 'ORDRE_DE_FABRICATION' as const,
    }));
    const result = port.elementsDisponibles();
    whenCollectionAnswers({ content: firstPage, currentPage: 0, pageSize: 100, totalElementsCount: 101 });
    await whenNextPageStarts();
    whenCollectionAnswers({
      content: [{ id: 'last', nom: 'Dernier moule', type: 'PRODUIT' }],
      currentPage: 1,
      pageSize: 100,
      totalElementsCount: 101,
    });
    const elements = await result;

    expect(elements).toHaveLength(101);
    expect(elements.at(-1)).toEqual({ id: new ElementChiffreId('last'), identite: new ElementChiffre('Dernier moule', 'PRODUIT') });
  });

  const whenNextPageStarts = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
  };

  const whenCollectionAnswers = (body: components['schemas']['PageRestElementDeFabrication'], checkPage = true): void => {
    const request = server.expectOne(candidate => candidate.url === '/api/elements-de-fabrication');
    expect(request.request.params.get('debut')).toBe('1970-01-01T00:00:00Z');
    expect(request.request.params.get('fin')).toBe('2999-12-31T23:59:59Z');
    if (checkPage) {
      expect(request.request.params.get('page')).toBe(String(body.currentPage));
    }
    expect(request.request.params.get('size')).toBe('100');
    request.flush(body);
  };

  it('should retain certain machine and work totals beside unresolved labour and non conformity', async () => {
    const result = port.rapport(DEMANDE);
    await whenServerAnswers({
      ...toRest([fraisageFixture]),
      temps: { travail: completFixture('PT5H'), nonConformite: { complete: false }, total: { complete: false } },
      cout: { machine: completFixture(300), mainDOeuvre: { complete: false }, total: { complete: false } },
    });
    const rapport = await result;

    expect(rapport?.temps.travail.snapshot()).toEqual({ complete: true, valeur: new DureePassee('PT5H') });
    expect(rapport?.temps.nonConformite.snapshot()).toEqual({ complete: false });
    expect(rapport?.temps.total.snapshot()).toEqual({ complete: false });
    expect(rapport?.cout.machine.snapshot()).toEqual({ complete: true, valeur: new Montant(300) });
    expect(rapport?.cout.mainDOeuvre.snapshot()).toEqual({ complete: false });
    expect(rapport?.cout.total.snapshot()).toEqual({ complete: false });
  });

  it('should reject a complete duration without a value and report the failure once', async () => {
    const result = port.rapport(DEMANDE).catch((failure: unknown) => failure);
    await whenServerAnswers({ ...toRest([fraisageFixture]), temps: { travail: { complete: true } } });

    expect(await result).toEqual(new Error('rapport.temps.travail.valeur manque dans la réponse du serveur'));
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should reject a complete amount without a value instead of substituting zero', async () => {
    const result = port.rapport(DEMANDE).catch((failure: unknown) => failure);
    await whenServerAnswers({ ...toRest([fraisageFixture]), cout: { machine: { complete: true } } });

    expect(await result).toEqual(new Error('rapport.cout.machine.valeur manque dans la réponse du serveur'));
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should return the evaluation instant and the number of excluded current activities', async () => {
    const result = port.rapport(DEMANDE);
    await whenServerAnswers({ ...toRest([fraisageFixture]), evaluation: '2026-05-11T21:00:00Z', activitesEnCours: 2 });
    const rapport = await result;

    expect(rapport?.evaluation.value.toISOString()).toBe('2026-05-11T21:00:00.000Z');
    expect(rapport?.activitesEnCours.nombre).toBe(2);
  });

  it('should return every clocking of a line with its frozen rates, its cost and its shares', async () => {
    const result = port.rapport(DEMANDE);
    await whenServerAnswers({
      ...toRest([fraisageFixture]),
      lignes: [
        {
          ...toRestLigne(fraisageFixture),
          pointages: [
            {
              anomalies: [],
              operateur: { id: 'operateur-1', prenom: 'Julien', nom: 'Martin' },
              poste: { id: 'poste-dmg', libelle: 'DMG DMU 50' },
              categorie: 'TRAVAIL',
              debut: '2026-09-12T07:30:00Z',
              fin: '2026-09-12T09:00:00Z',
              duree: completFixture('PT1H30M'),
              coutHoraire: 48,
              tauxHoraire: 35,
              cout: { machine: completFixture(72), mainDOeuvre: completFixture(26.25), total: completFixture(98.25) },
              parts: [
                {
                  debut: '2026-09-12T07:30:00Z',
                  fin: '2026-09-12T09:00:00Z',
                  duree: 'PT1H30M',
                  diviseur: 2,
                  mainDOeuvre: completFixture(26.25),
                  paralleles: [
                    {
                      element: { id: 'element-2', nom: 'OF-2026-000192', type: 'ORDRE_DE_FABRICATION' },
                      poste: { id: 'poste-haas', libelle: 'Haas VF-2' },
                      nature: 'Fraisage',
                    },
                  ],
                  bloquants: [],
                },
              ],
              contradictoires: [],
            },
          ],
        },
      ],
    });
    const pointage = (await result)?.lignes[0]?.pointages[0];

    expect([pointage?.anomalies, pointage?.finAuPlusTard, pointage?.contradictoires]).toEqual([[], undefined, []]);
    expect(pointage?.operateur).toEqual(new OperateurCite('operateur-1', 'Julien', 'Martin'));
    expect(pointage?.poste).toEqual(new PosteCite('poste-dmg', 'DMG DMU 50'));
    expect([pointage?.categorie, pointage?.coutHoraire, pointage?.tauxHoraire]).toEqual(['TRAVAIL', new Montant(48), new Montant(35)]);
    expect(pointage?.periode.fin?.value.toISOString()).toBe('2026-09-12T09:00:00.000Z');
    expect(pointage?.cout.mainDOeuvre.snapshot()).toEqual({ complete: true, valeur: new Montant(26.25) });
    expect(pointage?.parts).toEqual([
      new PartDePointage({
        debut: new InstantDeTravail('2026-09-12T07:30:00Z'),
        fin: new InstantDeTravail('2026-09-12T09:00:00Z'),
        duree: new DureePassee('PT1H30M'),
        diviseur: 2,
        mainDOeuvre: TotalDeMontant.complet(new Montant(26.25)),
        paralleles: [
          new ActiviteCitee(
            new ElementCite(new ElementChiffreId('element-2'), 'OF-2026-000192', 'ORDRE_DE_FABRICATION'),
            new PosteCite('poste-haas', 'Haas VF-2'),
            new NatureDOperation('Fraisage'),
          ),
        ],
        bloquants: [],
      }),
    ]);
  });

  it('should return a clocking to resolve without finish, work station, rates nor amounts, with its contradictory clockings', async () => {
    const result = port.rapport(DEMANDE);
    await whenServerAnswers({
      ...toRest([fraisageFixture]),
      lignes: [
        {
          ...toRestLigne(fraisageFixture),
          pointages: [
            {
              anomalies: ['A_RESOUDRE'],
              operateur: { id: 'operateur-inconnu' },
              categorie: 'NON_CONFORMITE',
              debut: '2026-09-17T08:00:00Z',
              finAuPlusTard: '2026-09-17T11:40:00Z',
              duree: { complete: false },
              cout: { machine: { complete: false }, mainDOeuvre: { complete: false }, total: { complete: false } },
              parts: [],
              contradictoires: [
                { id: 'fait-1', type: 'DEBUT', survenue: '2026-09-17T08:00:00Z' },
                { id: 'fait-2', type: 'DEBUT', survenue: '2026-09-17T09:10:00Z' },
              ],
            },
          ],
        },
      ],
    });
    const pointage = (await result)?.lignes[0]?.pointages[0];

    expect([pointage?.poste, pointage?.coutHoraire, pointage?.tauxHoraire, pointage?.periode.fin]).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
    expect(pointage?.operateur.estNomme()).toBe(false);
    expect(pointage?.duree.snapshot()).toEqual({ complete: false });
    expect(pointage?.anomalies).toEqual(['A_RESOUDRE']);
    expect(pointage?.finAuPlusTard?.value.toISOString()).toBe('2026-09-17T11:40:00.000Z');
    expect(pointage?.contradictoires).toEqual([
      new PointageEnConflit('fait-1', 'DEBUT', new InstantDeTravail('2026-09-17T08:00:00Z')),
      new PointageEnConflit('fait-2', 'DEBUT', new InstantDeTravail('2026-09-17T09:10:00Z')),
    ]);
  });

  it('should keep a share whose divisor is unknown, with the clockings that block it', async () => {
    const result = port.rapport(DEMANDE);
    await whenServerAnswers({
      ...toRest([fraisageFixture]),
      lignes: [
        {
          ...toRestLigne(fraisageFixture),
          pointages: [
            {
              anomalies: ['PARTAGE_INCONNU'],
              operateur: { id: 'operateur-1', prenom: 'Sophie', nom: 'Laurent' },
              categorie: 'TRAVAIL',
              debut: '2026-09-18T09:00:00Z',
              fin: '2026-09-18T10:00:00Z',
              duree: completFixture('PT1H'),
              tauxHoraire: 32,
              cout: { machine: completFixture(0), mainDOeuvre: { complete: false }, total: { complete: false } },
              parts: [
                {
                  debut: '2026-09-18T09:00:00Z',
                  fin: '2026-09-18T10:00:00Z',
                  duree: 'PT1H',
                  mainDOeuvre: { complete: false },
                  paralleles: [],
                  bloquants: [{ element: { id: 'element-inconnu' } }],
                },
              ],
              contradictoires: [],
            },
          ],
        },
      ],
    });
    const part = (await result)?.lignes[0]?.pointages[0]?.parts[0];

    expect(part?.partageInconnu()).toBe(true);
    expect(part?.bloquants).toEqual([
      new ActiviteCitee(new ElementCite(new ElementChiffreId('element-inconnu'), undefined, undefined), undefined, undefined),
    ]);
  });

  it('should display a received recalculation from forty to thirty euros without dividing current activities', async () => {
    const premier = port.rapport(DEMANDE);
    await whenServerAnswers({
      ...toRest([fraisageFixture]),
      cout: { machine: completFixture(0), mainDOeuvre: completFixture(40), total: completFixture(40) },
    });
    const avant = await premier;
    const suivant = port.rapport(DEMANDE);
    await whenServerAnswers({
      ...toRest([fraisageFixture]),
      cout: { machine: completFixture(0), mainDOeuvre: completFixture(30), total: completFixture(30) },
    });
    const apres = await suivant;

    expect([avant?.cout.mainDOeuvre.snapshot(), apres?.cout.mainDOeuvre.snapshot()]).toEqual([
      { complete: true, valeur: new Montant(40) },
      { complete: true, valeur: new Montant(30) },
    ]);
  });

  it('should ask the server for the element, never for its workshop follow-up', async () => {
    const result = port.rapport(DEMANDE);
    const request = await whenServerAnswers(toRest([fraisageFixture]));

    await result;
    expect(request.request.url).toBe(`${ROUTE}/${ELEMENT}`);
  });

  it.each<keyof RestRapport>(['element', 'lignes', 'temps', 'cout'])('should reject a server answer missing rapport.%s', async champ => {
    const result = port.rapport(DEMANDE).catch((failure: unknown) => failure);
    await whenServerAnswers(sansChampDuRapport(toRest([fraisageFixture]), champ));

    expect(await result).toEqual(new Error(`rapport.${champ} manque dans la réponse du serveur`));
  });

  it.each<keyof RestLigne>(['temps', 'cout', 'pointages'])('should reject a server answer missing ligne.%s', async champ => {
    const rapport = toRest([fraisageFixture]);
    const result = port.rapport(DEMANDE).catch((failure: unknown) => failure);
    await whenServerAnswers({ ...rapport, lignes: [sansChampDeLigne(premiereLigneDe(rapport), champ)] });

    expect(await result).toEqual(new Error(`ligne.${champ} manque dans la réponse du serveur`));
  });

  it('should reject a server answer missing the element name', async () => {
    const result = port.rapport(DEMANDE).catch((failure: unknown) => failure);
    await whenServerAnswers({ ...toRest([fraisageFixture]), element: { id: ELEMENT, type: 'ORDRE_DE_FABRICATION' } });

    expect(await result).toEqual(new Error('rapport.element.nom manque dans la réponse du serveur'));
  });

  it('should reject a server answer missing the element type', async () => {
    const result = port.rapport(DEMANDE).catch((failure: unknown) => failure);
    await whenServerAnswers({ ...toRest([fraisageFixture]), element: { id: ELEMENT, nom: 'OF-2026-000001' } });

    expect(await result).toEqual(new Error('rapport.element.type manque dans la réponse du serveur'));
  });

  it('should reject a duration the report cannot read', async () => {
    const result = port.rapport(DEMANDE).catch((failure: unknown) => failure);
    await whenServerAnswers({
      ...toRest([fraisageFixture]),
      temps: { total: completFixture('P1D'), travail: completFixture(TOTAL.travail), nonConformite: completFixture(TOTAL.nonConformite) },
    });

    expect(await result).toEqual(new Error('La durée « P1D » reçue du serveur n’est pas un temps passé.'));
  });

  it('should reject an amount the report cannot read', async () => {
    const result = port.rapport(DEMANDE).catch((failure: unknown) => failure);
    await whenServerAnswers({
      ...toRest([fraisageFixture]),
      cout: { total: completFixture(-1), machine: completFixture(COUT_TOTAL.machine), mainDOeuvre: completFixture(COUT_TOTAL.mainDOeuvre) },
    });

    expect(await result).toEqual(new Error('Le montant « -1 » reçu du serveur n’est pas un montant en euros.'));
  });

  it('should report a technical failure once through the error handler and reject', async () => {
    const result = port.rapport(DEMANDE).catch((failure: unknown) => failure);
    await whenServerFails(500, {});

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should not report an element the referential does not know', async () => {
    const result = port.rapport(DEMANDE);
    await whenServerFails(404, { title: 'element de fabrication introuvable' });

    expect(await result).toBeUndefined();
    expect(errorHandler.errors).toEqual([]);
  });

  it('should keep a refused read a technical failure', async () => {
    const result = port.rapport(DEMANDE).catch((failure: unknown) => failure);
    await whenServerFails(403, {});

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  const whenServerAnswers = async (body: RestRapport): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(candidate => candidate.method === 'GET' && candidate.url === `${ROUTE}/${ELEMENT}`);
    request.flush(body);
    return request;
  };

  const whenServerFails = async (status: number, error: object): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server
      .expectOne(candidate => candidate.method === 'GET' && candidate.url === `${ROUTE}/${ELEMENT}`)
      .flush(error, { status, statusText: 'Failure' });
  };
});
