import { components } from '@/app/generated/schema';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiClient } from './ApiClient';

const SUIVI_ID = 'b7f0c2de-1f2a-4c3b-9d4e-5f6a7b8c9d0e';
const OPERATEUR_ID = '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d';
const PLEINE_PAGE = 100;

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

    thenItReached(requete, '/api/atelier/suivis?etats=EN_ATTENTE&etats=EN_COURS&size=100');
    await whenTheRequestCompletes(lecture);
  });

  it('should leave out a parameter the caller did not fill', async () => {
    const lecture = whenReadingOperatorsWithoutAWorkstation();

    const requete = await whenTheServerAnswers(UNE_PAGE_DOPERATEURS);

    thenItReached(requete, '/api/operateurs?size=100');
    await whenTheRequestCompletes(lecture);
  });

  it('should put the path parameters the caller gave into the URL', async () => {
    const ecriture = whenStartingWork();

    const requete = await whenTheServerAnswers(UN_SUIVI);

    thenItReached(requete, `/api/atelier/suivis/${SUIVI_ID}/pointages`);
    await whenTheRequestCompletes(ecriture);
  });

  it('should send the body the caller gave to write', async () => {
    const ecriture = whenPausingWork();

    const requete = await whenTheServerAnswers({});

    thenItSent(requete, { id: 'evenement', operateur: OPERATEUR_ID, type: 'PAUSE' });
    await whenTheRequestCompletes(ecriture);
  });

  const unTourDeBoucle = (): Promise<void> => new Promise(resolve => setTimeout(resolve));

  const whenReadingOperators = (): Promise<unknown> => api.read('/api/operateurs', { queryParams: { size: PLEINE_PAGE } });

  const whenReadingWorkshopElementsInProgress = (): Promise<unknown> =>
    api.read('/api/atelier/suivis', { queryParams: { etats: ['EN_ATTENTE', 'EN_COURS'], size: PLEINE_PAGE } });

  const whenReadingOperatorsWithoutAWorkstation = (): Promise<unknown> =>
    api.read('/api/operateurs', { queryParams: { size: PLEINE_PAGE } });

  const whenStartingWork = (): Promise<unknown> =>
    api.write('/api/atelier/suivis/{id}/pointages', {
      pathParams: { id: SUIVI_ID },
      body: { id: 'evenement', operateur: OPERATEUR_ID, type: 'DEBUT' },
    });

  const whenPausingWork = (): Promise<unknown> =>
    api.write('/api/atelier/journees/pointages', { body: { id: 'evenement', operateur: OPERATEUR_ID, type: 'PAUSE' } });

  const whenTheServerAnswers = async (reponse: object): Promise<TestRequest> => {
    await unTourDeBoucle();

    const requete = serveur.expectOne(() => true);
    requete.flush(reponse);

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

  const thenItHandedBack = (recu: unknown, attendu: unknown): void => {
    expect(recu).toEqual(attendu);
  };
});
