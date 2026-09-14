import { components } from '@/app/generated/schema';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { expectTypeOf } from 'vitest';
import { ApiClient } from './ApiClient';

const SUIVI_ID = 'b7f0c2de-1f2a-4c3b-9d4e-5f6a7b8c9d0e';
const OPERATEUR_ID = '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d';
const PLEINE_PAGE = 100;
const POSTE_ID = 'poste/avec espace';
const MODIFICATION_POSTE = {
  libelle: 'Tour 2',
  nature: 'tournage',
  coutHoraire: 45.5,
} satisfies components['schemas']['RestModificationPosteDeTravail'];
const UN_POSTE = { id: POSTE_ID, ...MODIFICATION_POSTE } satisfies components['schemas']['RestPosteDeTravail'];

const UNE_PAGE_DOPERATEURS = {
  content: [{ id: OPERATEUR_ID, nom: 'Dupont', prenom: 'Jean', natures: [], postes: [] }],
  currentPage: 0,
  pageSize: 1,
  totalElementsCount: 1,
} satisfies components['schemas']['PageRestOperateur'];

const UNE_PAGE_DE_SUIVIS = {
  content: [],
  currentPage: 0,
  pageSize: 0,
  totalElementsCount: 0,
} satisfies components['schemas']['PageRestSuiviDAtelierEnGrille'];

const UN_SUIVI = {
  activitesEnCours: [],
  element: 'element',
  engageLe: '2026-09-05T08:00:00Z',
  engagePar: 'gestionnaire',
  etat: 'EN_COURS',
  id: SUIVI_ID,
  journal: [],
  nom: 'OF-1',
  type: 'ORDRE_DE_FABRICATION',
} satisfies components['schemas']['RestSuiviDAtelier'];

describe('ApiClient', () => {
  let api: ApiClient;
  let serveur: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), ApiClient] });
    api = TestBed.inject(ApiClient);
    serveur = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    serveur.verify();
    vi.useRealTimers();
  });

  it('should hand back what the server answered on the route it was asked for', async () => {
    const lecture = whenReadingOperators();

    const requete = await whenTheServerAnswers(UNE_PAGE_DOPERATEURS);

    thenItReached(requete, '/api/operateurs?size=100');
    thenItHandedBack(await lecture, UNE_PAGE_DOPERATEURS);
  });

  it('should repeat a parameter the caller gave several values', async () => {
    const lecture = whenReadingWorkshopElementsInProgress();

    const requete = await whenTheServerAnswers(UNE_PAGE_DE_SUIVIS);

    await whenTheRequestCompletes(lecture);

    thenItReached(requete, '/api/atelier/suivis?etats=EN_ATTENTE&etats=EN_COURS&size=100');
  });

  it('should leave out a parameter the caller did not fill', async () => {
    const lecture = whenReadingOperatorsWithoutAWorkstation();

    const requete = await whenTheServerAnswers(UNE_PAGE_DOPERATEURS);

    await whenTheRequestCompletes(lecture);

    thenItReached(requete, '/api/operateurs?size=100');
  });

  it('should put the path parameters the caller gave into the URL', async () => {
    const ecriture = whenStartingWork();

    const requete = await whenTheServerAnswers(UN_SUIVI);

    await whenTheRequestCompletes(ecriture);

    thenItReached(requete, `/api/atelier/suivis/${SUIVI_ID}/pointages`);
  });

  it('should send the body the caller gave to write', async () => {
    const ecriture = whenPausingWork();

    const requete = await whenTheServerAnswers({});

    await whenTheRequestCompletes(ecriture);

    thenItSent(requete, { id: 'evenement', operateur: OPERATEUR_ID, type: 'PAUSE' });
  });

  it('should update the requested workstation and return the server answer', async () => {
    const modification = whenUpdatingAWorkstation();

    const request = await whenTheServerAnswers(UN_POSTE);
    const result = await modification;

    thenItReached(request, '/api/postes-de-travail/poste%2Favec%20espace');
    thenItUsed(request, 'PUT');
    thenItSent(request, MODIFICATION_POSTE);
    thenItHandedBack(result, UN_POSTE);
  });

  it('should delete the requested workstation without sending a body', async () => {
    const deletion = whenDeletingAWorkstation();

    const request = await whenTheServerAnswers(null, 204);
    const result = await deletion;

    thenItReached(request, '/api/postes-de-travail/poste%2Favec%20espace');
    thenItUsed(request, 'DELETE');
    thenItSent(request, null);
    thenItHandedBack(result, null);
  });

  it.each(['update', 'delete'] as const)('should propagate an HTTP failure from %s unchanged', async operation => {
    const result = whenStartingAStalledRequest(operation);

    await whenTheServerAnswers({ type: 'urn:glm:erreur:poste-de-travail:conflit', detail: 'Refus du serveur' }, 409);

    expect(await result).toMatchObject({
      status: 409,
      error: { type: 'urn:glm:erreur:poste-de-travail:conflit', detail: 'Refus du serveur' },
    });
  });

  it('should only accept update routes and payloads declared by the API contract', () => {
    type UpdatePoste = typeof api.update<'/api/postes-de-travail/{id}'>;
    type Request = Parameters<UpdatePoste>[1];

    expectTypeOf<'/api/postes-de-travail'>().not.toExtend<Parameters<ApiClient['update']>[0]>();
    expectTypeOf<Request['pathParams']>().toEqualTypeOf<{ id: string }>();
    expectTypeOf<Request['body']>().toEqualTypeOf<components['schemas']['RestModificationPosteDeTravail']>();
    expectTypeOf<Request['queryParams']>().toEqualTypeOf<undefined>();
    expectTypeOf<{ body: { libelle: string; nature: string } }>().not.toExtend<Request>();
    expectTypeOf<{ pathParams: { id: string } }>().not.toExtend<Request>();
    expectTypeOf<{ pathParams: { id: string }; body: { libelle: string } }>().not.toExtend<Request>();
    expectTypeOf<{ pathParams: { id: string }; body: { libelle: string; nature: string; coutHoraire: string } }>().not.toExtend<Request>();
    expectTypeOf<ReturnType<UpdatePoste>>().toEqualTypeOf<Promise<unknown>>();
  });

  it('should only accept deletion routes and parameters declared by the API contract', () => {
    type DeletePoste = typeof api.delete<'/api/postes-de-travail/{id}'>;
    type Request = Parameters<DeletePoste>[1];

    expectTypeOf<'/api/postes-de-travail'>().not.toExtend<Parameters<ApiClient['delete']>[0]>();
    expectTypeOf<Request['pathParams']>().toEqualTypeOf<{ id: string }>();
    expectTypeOf<Request['queryParams']>().toEqualTypeOf<undefined>();
    expectTypeOf<'body'>().not.toExtend<keyof Request>();
    expectTypeOf<{ pathParams: { id: number } }>().not.toExtend<Request>();
    expectTypeOf<Record<string, never>>().not.toExtend<Request>();
    expectTypeOf<ReturnType<DeletePoste>>().toEqualTypeOf<Promise<null>>();
  });

  it.each(['read', 'write', 'update', 'delete'] as const)('should cancel a stalled %s after thirty seconds', async operation => {
    givenAStoppedNetworkClock();
    const result = whenStartingAStalledRequest(operation);
    const request = givenTheServerDoesNotAnswer();

    await whenThirtySecondsElapse();

    thenTheRequestWasCancelled(request);
    await thenTheTimeoutWasReported(result);
  });

  const givenAStoppedNetworkClock = (): void => {
    vi.useFakeTimers();
  };

  const whenStartingAStalledRequest = (operation: 'read' | 'write' | 'update' | 'delete'): Promise<unknown> => {
    const requests = {
      read: whenReadingOperators,
      write: whenPausingWork,
      update: whenUpdatingAWorkstation,
      delete: whenDeletingAWorkstation,
    };
    return requests[operation]().catch((error: unknown) => error);
  };

  const givenTheServerDoesNotAnswer = (): TestRequest => serveur.expectOne(() => true);

  const whenThirtySecondsElapse = async (): Promise<void> => {
    await vi.advanceTimersByTimeAsync(30_000);
  };

  const unTourDeBoucle = (): Promise<void> => new Promise(resolve => setTimeout(resolve));

  const whenReadingOperators = (): Promise<unknown> => api.read('/api/operateurs', { queryParams: { size: PLEINE_PAGE } });

  const whenReadingWorkshopElementsInProgress = (): Promise<unknown> =>
    api.read('/api/atelier/suivis', { queryParams: { etats: ['EN_ATTENTE', 'EN_COURS'], size: PLEINE_PAGE } });

  const whenReadingOperatorsWithoutAWorkstation = (): Promise<unknown> =>
    api.read('/api/operateurs', { queryParams: { poste: undefined, size: PLEINE_PAGE } });

  const whenStartingWork = (): Promise<unknown> =>
    api.write('/api/atelier/suivis/{id}/pointages', {
      pathParams: { id: SUIVI_ID },
      body: { id: 'evenement', operateur: OPERATEUR_ID, type: 'DEBUT' },
    });

  const whenPausingWork = (): Promise<unknown> =>
    api.write('/api/atelier/journees/pointages', { body: { id: 'evenement', operateur: OPERATEUR_ID, type: 'PAUSE' } });

  const whenUpdatingAWorkstation = (): Promise<unknown> =>
    api.update('/api/postes-de-travail/{id}', { pathParams: { id: POSTE_ID }, body: MODIFICATION_POSTE });

  const whenDeletingAWorkstation = (): Promise<null> => api.delete('/api/postes-de-travail/{id}', { pathParams: { id: POSTE_ID } });

  const whenTheServerAnswers = async (reponse: object | null, status = 200): Promise<TestRequest> => {
    await unTourDeBoucle();

    const requete = serveur.expectOne(() => true);
    requete.flush(reponse, { status, statusText: 'OK' });

    return requete;
  };

  const whenTheRequestCompletes = async (request: Promise<unknown>): Promise<void> => {
    await request;
  };

  const thenItReached = (requete: TestRequest, url: string): void => {
    expect(requete.request.urlWithParams).toBe(url);
  };

  const thenItSent = (requete: TestRequest, body: unknown): void => {
    expect(requete.request.body).toEqual(body);
  };

  const thenItUsed = (request: TestRequest, method: string): void => {
    expect(request.request.method).toBe(method);
  };

  const thenItHandedBack = (recu: unknown, attendu: unknown): void => {
    expect(recu).toEqual(attendu);
  };

  const thenTheRequestWasCancelled = (request: TestRequest): void => {
    expect(request.cancelled).toBe(true);
  };

  const thenTheTimeoutWasReported = async (result: Promise<unknown>): Promise<void> => {
    await expect(result).resolves.toBeInstanceOf(Error);
  };
});
