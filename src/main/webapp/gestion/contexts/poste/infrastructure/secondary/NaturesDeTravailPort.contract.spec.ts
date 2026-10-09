import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { NaturesDeTravailFixture } from '@test/unit/fixtures/gestion/poste/NaturesDeTravailFixture';
import { defer, Observable, of, switchMap, throwError } from 'rxjs';
import { NatureDejaExistante } from '../../domain/NatureDejaExistante';
import { NatureDeTravail } from '../../domain/NatureDeTravail';
import { NatureDeTravailId } from '../../domain/NatureDeTravailId';
import { NatureGeree } from '../../domain/NatureGeree';
import { NatureIntrouvable } from '../../domain/NatureIntrouvable';
import { NaturePointee } from '../../domain/NaturePointee';
import { NaturesDeTravailPort } from '../../domain/NaturesDeTravailPort';
import { NatureUtilisee } from '../../domain/NatureUtilisee';
import { HttpNaturesDeTravail } from './HttpNaturesDeTravail';

const ROUTE = '/api/natures-de-travail';
const URN = 'urn:glm:erreur:nature-de-travail:';

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

  private enregistrer(body: { libelle: string }): HttpResponse<unknown> | HttpErrorResponse {
    const cle = cleFixture(body.libelle);
    if (this.natures.some(nature => cleFixture(nature.libelle) === cle)) {
      return new HttpErrorResponse({ status: 409, statusText: 'Conflict', error: { type: `${URN}nature-deja-existante` } });
    }
    const nature = { id: `nature-${String(this.natures.length + 1)}`, libelle: body.libelle.trim(), utilisee: false, postes: 0 };
    this.natures = [...this.natures, nature];
    return new HttpResponse({ status: 201, body: nature });
  }

  private supprimer(id: string): HttpResponse<unknown> | HttpErrorResponse {
    const nature = this.natures.find(candidate => candidate.id === id);
    if (nature === undefined) {
      return new HttpErrorResponse({ status: 404, statusText: 'Not Found', error: { type: `${URN}nature-introuvable` } });
    }
    if (nature.postes > 0) {
      return new HttpErrorResponse({ status: 409, statusText: 'Conflict', error: { type: `${URN}nature-utilisee` } });
    }
    if (nature.utilisee) {
      return new HttpErrorResponse({ status: 409, statusText: 'Conflict', error: { type: `${URN}nature-pointee` } });
    }
    this.natures = this.natures.filter(candidate => candidate !== nature);
    return new HttpResponse({ status: 204 });
  }

  private renommer(id: string, body: { libelle: string }): HttpResponse<unknown> | HttpErrorResponse {
    const nature = this.natures.find(candidate => candidate.id === id);
    if (nature === undefined) {
      return new HttpErrorResponse({ status: 404, statusText: 'Not Found', error: { type: `${URN}nature-introuvable` } });
    }
    const cle = cleFixture(body.libelle);
    if (this.natures.some(autre => autre !== nature && cleFixture(autre.libelle) === cle)) {
      return new HttpErrorResponse({ status: 409, statusText: 'Conflict', error: { type: `${URN}nature-deja-existante` } });
    }
    const renommee = { ...nature, libelle: body.libelle.trim() };
    this.natures = this.natures.map(candidate => (candidate === nature ? renommee : candidate));
    return new HttpResponse({ status: 200, body: renommee });
  }

  private async answer(request: HttpRequest<unknown>): Promise<HttpResponse<unknown> | HttpErrorResponse> {
    await new Promise(resolve => setTimeout(resolve));
    const url = new URL(request.urlWithParams, 'http://localhost');
    if (!url.pathname.startsWith(ROUTE)) {
      return new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    }
    if (request.method === 'POST') {
      return this.enregistrer(request.body as { libelle: string });
    }
    if (request.method === 'DELETE') {
      return this.supprimer(decodeURIComponent(url.pathname.substring(`${ROUTE}/`.length)));
    }
    if (request.method === 'PUT') {
      return this.renommer(decodeURIComponent(url.pathname.substring(`${ROUTE}/`.length)), request.body as { libelle: string });
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

const cleFixture = (libelle: string): string => libelle.normalize('NFD').replace(/\p{M}/gu, '').trim().toLocaleLowerCase('fr-FR');

interface NaturesHarness {
  readonly port: NaturesDeTravailPort;
  declare(natures: readonly NatureFixture[]): void;
  pointer(natures: readonly NatureFixture[]): void;
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
    pointer: () => undefined,
  };
};

const createFixtureHarness = (): NaturesHarness => {
  const fixture = new NaturesDeTravailFixture();
  return {
    port: fixture,
    declare: natures => {
      fixture.liste = natures.map(geree);
    },
    pointer: natures => {
      fixture.pointees = natures.map(nature => nature.id);
    },
  };
};

const geree = (nature: NatureFixture): NatureGeree =>
  new NatureGeree(new NatureDeTravailId(nature.id), new NatureDeTravail(nature.libelle), {
    utilisee: nature.utilisee,
    postes: nature.postes,
  });

const libellesEtPostes = (natures: readonly NatureGeree[]): [string, number][] =>
  natures.map(nature => [nature.libelle.value, nature.postes]);

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

  it('should save a new nature with no poste yet', async () => {
    harness.declare([tournageFixture]);

    const resultat = await harness.port.enregistrer(new NatureDeTravail('Rectification'));

    expect(resultat).toEqual({ ok: true, value: undefined });
    expect(libellesEtPostes(await harness.port.natures())).toEqual([
      ['Rectification', 0],
      ['Tournage', 2],
    ]);
  });

  it('should rename a nature and keep its postes', async () => {
    harness.declare([tournageFixture]);

    const resultat = await harness.port.renommer(new NatureDeTravailId(tournageFixture.id), new NatureDeTravail('Décolletage'));

    expect(resultat).toEqual({ ok: true, value: undefined });
    expect(libellesEtPostes(await harness.port.natures())).toEqual([['Décolletage', 2]]);
  });

  it('should let a nature change only the case of its name', async () => {
    harness.declare([tournageFixture]);

    const resultat = await harness.port.renommer(new NatureDeTravailId(tournageFixture.id), new NatureDeTravail('TOURNAGE'));

    expect(resultat).toEqual({ ok: true, value: undefined });
  });

  it('should refuse to rename a nature with the name of another one', async () => {
    harness.declare([tournageFixture, dessinFixture]);

    const resultat = await harness.port.renommer(new NatureDeTravailId(tournageFixture.id), new NatureDeTravail('dessin'));

    expect(resultat).toEqual({ ok: false, error: new NatureDejaExistante() });
  });

  it('should refuse to rename a nature that no longer exists', async () => {
    harness.declare([tournageFixture]);

    const resultat = await harness.port.renommer(new NatureDeTravailId('nature-disparue'), new NatureDeTravail('Décolletage'));

    expect(resultat).toEqual({ ok: false, error: new NatureIntrouvable() });
  });

  it('should remove a nature that nothing uses', async () => {
    harness.declare([tournageFixture, dessinFixture]);

    const resultat = await harness.port.supprimer(new NatureDeTravailId(dessinFixture.id));

    expect(resultat).toEqual({ ok: true, value: undefined });
    expect(libellesEtPostes(await harness.port.natures())).toEqual([['Tournage', 2]]);
  });

  it('should refuse to remove a nature that a poste carries', async () => {
    harness.declare([tournageFixture]);

    const resultat = await harness.port.supprimer(new NatureDeTravailId(tournageFixture.id));

    expect(resultat).toEqual({ ok: false, error: new NatureUtilisee() });
  });

  it('should refuse for good to remove a nature under which time was clocked', async () => {
    harness.declare([peintureFixture]);
    harness.pointer([peintureFixture]);

    const resultat = await harness.port.supprimer(new NatureDeTravailId(peintureFixture.id));

    expect(resultat).toEqual({ ok: false, error: new NaturePointee() });
  });

  it('should refuse to remove a nature that no longer exists', async () => {
    harness.declare([]);

    const resultat = await harness.port.supprimer(new NatureDeTravailId('nature-disparue'));

    expect(resultat).toEqual({ ok: false, error: new NatureIntrouvable() });
  });

  it('should refuse a nature whose name already exists, whatever its case and accents', async () => {
    harness.declare([tournageFixture]);

    const resultat = await harness.port.enregistrer(new NatureDeTravail('TOURNÂGE'));

    expect(resultat).toEqual({ ok: false, error: new NatureDejaExistante() });
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

  it('should keep an unknown refusal of a saving as a technical failure', async () => {
    const result = port.enregistrer(new NatureDeTravail('Rectification')).catch((failure: unknown) => failure);
    await whenServerAnswers(409, { type: `${URN}inconnu` });

    expect(await result).toBeInstanceOf(HttpErrorResponse);
  });

  it('should keep an unknown refusal of a renaming as a technical failure', async () => {
    const result = port
      .renommer(new NatureDeTravailId('nature-1'), new NatureDeTravail('Rectification'))
      .catch((failure: unknown) => failure);
    await whenServerAnswers(409, { type: `${URN}inconnu` }, `${ROUTE}/nature-1`);

    expect(await result).toBeInstanceOf(HttpErrorResponse);
  });

  it('should keep an unknown refusal of a removal as a technical failure', async () => {
    const result = port.supprimer(new NatureDeTravailId('nature-1')).catch((failure: unknown) => failure);
    await whenServerAnswers(409, { type: `${URN}inconnu` }, `${ROUTE}/nature-1`);

    expect(await result).toBeInstanceOf(HttpErrorResponse);
  });

  it('should send the name alone', async () => {
    const result = port.enregistrer(new NatureDeTravail('Rectification'));
    const request = await whenServerAnswers(201, { id: 'nature-1', libelle: 'Rectification', utilisee: false, postes: 0 });

    await result;
    expect(request.request.body).toEqual({ libelle: 'Rectification' });
  });

  it('should report a technical read failure once and reject', async () => {
    const result = port.natures().catch((failure: unknown) => failure);
    await whenServerFails();

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  const whenServerFails = async (): Promise<void> => {
    await whenServerAnswers(500, {});
  };
  const whenServerAnswers = async (status: number, body: object, url = ROUTE): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(candidate => candidate.url === url);
    request.flush(body, { status, statusText: 'Response' });
    return request;
  };
});
