import { components } from '@/app/generated/schema';
import { HttpErrorResponse, HttpHeaders, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiClient, DownloadedFile } from './ApiClient';
import { findApiErrorIn } from './findApiErrorIn';

const SUIVI_ID = 'b7f0c2de-1f2a-4c3b-9d4e-5f6a7b8c9d0e';
const OPERATEUR_ID = '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d';
const POINTAGE_ID = '932c0c0b-a676-408d-8f82-e9b56ad7791c';
const PLEINE_PAGE = 100;
const POSTE_ID = 'poste/avec espace';
const ELEMENT_ID = '4f8d1e0a-1111-2222-3333-444455556666';
const MODIFICATION_POSTE = {
  libelle: 'Tour 2',
  natureId: 'nature-tournage',
  coutHoraire: 45.5,
} satisfies components['schemas']['RestModificationPosteDeTravail'];
const UN_POSTE = { id: POSTE_ID, nature: 'tournage', ...MODIFICATION_POSTE } satisfies components['schemas']['RestPosteDeTravail'];

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
  categorie: 'OF',
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

  it('should hand back an image as the bytes the server sent, on the address of its version', async () => {
    const lecture = whenReadingTheLogo();

    const requete = await whenTheServerSendsAnImage(new Blob(['png'], { type: 'image/png' }));

    thenItReached(requete, '/api/parametrage/logo/0123456789abcdef');
    expect(requete.request.responseType).toBe('blob');
    expect(await (await lecture).text()).toBe('png');
  });

  it('should hand back a downloaded file with the name the server attached to it', async () => {
    const telechargement = whenDownloadingTheDetailedPdf();

    const requete = await whenTheServerSendsAFile('pdf', 'attachment; filename="cout-de-revient-OF-1-detail.pdf"');

    thenItReached(requete, `/api/couts-de-revient/${ELEMENT_ID}/export.pdf?version=detail`);
    await thenTheFileIs(telechargement, 'cout-de-revient-OF-1-detail.pdf', 'pdf');
  });

  it('should decode a file name the server encoded', async () => {
    const telechargement = whenDownloadingTheWorkbook();

    await whenTheServerSendsAFile('xlsx', "attachment; filename*=UTF-8''cout-de-revient-Moul%C3%A9.xlsx");

    await thenTheFileIs(telechargement, 'cout-de-revient-Moulé.xlsx', 'xlsx');
  });

  it('should leave the file name unknown when the server attaches none', async () => {
    const telechargement = whenDownloadingTheWorkbook();

    await whenTheServerSendsAFile('xlsx');

    await thenTheFileIs(telechargement, undefined, 'xlsx');
  });

  it('should hand back an empty file when the server sends no bytes', async () => {
    const telechargement = whenDownloadingTheWorkbook();

    await whenTheServerAnswers(null);

    await thenTheFileIs(telechargement, undefined, '');
  });

  it('should make a refusal sent in place of a file readable by its stable code', async () => {
    const telechargement = whenDownloadingTheWorkbook().catch((failure: unknown) => failure);

    await whenTheServerRefusesTheFile(
      JSON.stringify({ type: 'urn:glm:erreur:cout-de-revient:rapport-non-exportable', message: 'Rapport non exportable' }),
    );

    expect(findApiErrorIn(await telechargement)).toEqual({
      urn: 'urn:glm:erreur:cout-de-revient:rapport-non-exportable',
      message: 'Rapport non exportable',
    });
  });

  it('should keep the text of a refusal that is not a problem', async () => {
    const telechargement = whenDownloadingTheWorkbook().catch((failure: unknown) => failure);

    await whenTheServerRefusesTheFile('Bad Gateway');

    expect(await telechargement).toMatchObject({ status: 409, error: 'Bad Gateway' });
  });

  it('should propagate a download failure that carries no answer unchanged', async () => {
    const telechargement = whenDownloadingTheWorkbook().catch((failure: unknown) => failure);

    await whenTheNetworkFails();

    expect(((await telechargement) as HttpErrorResponse).error).toBeInstanceOf(ProgressEvent);
  });

  it('should send a file in the part the route names, and hand back the answer', async () => {
    const envoi = api.upload('/api/parametrage/logo', 'logo', new Blob(['png'], { type: 'image/png' }));

    const requete = await whenTheServerAnswers({ version: '0123456789abcdef' });

    thenItReached(requete, '/api/parametrage/logo');
    thenItSentTheFile(requete, 'logo', 'png');
    expect(await envoi).toEqual({ version: '0123456789abcdef' });
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
    const ecriture = whenFinishingActivity();

    const requete = await whenTheServerAnswers({});

    await whenTheRequestCompletes(ecriture);

    thenItSent(requete, { id: POINTAGE_ID, operateur: OPERATEUR_ID, type: 'FIN' });
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

  it.each(['read', 'download', 'write', 'update', 'delete'] as const)(
    'should cancel a stalled %s after thirty seconds',
    async operation => {
      givenAStoppedNetworkClock();
      const result = whenStartingAStalledRequest(operation);
      const request = givenTheServerDoesNotAnswer();

      await whenThirtySecondsElapse();

      thenTheRequestWasCancelled(request);
      await thenTheTimeoutWasReported(result);
    },
  );

  const givenAStoppedNetworkClock = (): void => {
    vi.useFakeTimers();
  };

  const whenStartingAStalledRequest = (operation: 'read' | 'download' | 'write' | 'update' | 'delete'): Promise<unknown> => {
    const requests = {
      read: whenReadingOperators,
      download: whenDownloadingTheWorkbook,
      write: whenFinishingActivity,
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

  const whenReadingTheLogo = (): Promise<Blob> =>
    api.readImage('/api/parametrage/logo/{version}', { pathParams: { version: '0123456789abcdef' } });

  const whenTheServerSendsAnImage = async (image: Blob): Promise<TestRequest> => {
    await unTourDeBoucle();

    const requete = serveur.expectOne(() => true);
    requete.flush(image);

    return requete;
  };

  const whenDownloadingTheDetailedPdf = (): Promise<DownloadedFile> =>
    api.download('/api/couts-de-revient/{elementId}/export.pdf', {
      pathParams: { elementId: ELEMENT_ID },
      queryParams: { version: 'detail' },
    });

  const whenDownloadingTheWorkbook = (): Promise<DownloadedFile> =>
    api.download('/api/couts-de-revient/{elementId}/export.xlsx', { pathParams: { elementId: ELEMENT_ID } });

  const whenTheServerSendsAFile = async (contenu: string, disposition?: string): Promise<TestRequest> => {
    await unTourDeBoucle();

    const requete = serveur.expectOne(() => true);
    requete.flush(new Blob([contenu]), {
      headers: disposition === undefined ? new HttpHeaders() : new HttpHeaders({ 'Content-Disposition': disposition }),
    });

    return requete;
  };

  const whenTheServerRefusesTheFile = async (corps: string): Promise<void> => {
    await unTourDeBoucle();

    serveur.expectOne(() => true).flush(new Blob([corps]), { status: 409, statusText: 'Conflict' });
    await unTourDeBoucle();
  };

  const whenTheNetworkFails = async (): Promise<void> => {
    await unTourDeBoucle();

    serveur.expectOne(() => true).error(new ProgressEvent('error'));
  };

  const thenTheFileIs = async (telechargement: Promise<DownloadedFile>, nom: string | undefined, contenu: string): Promise<void> => {
    const fichier = await telechargement;
    expect(fichier.filename).toBe(nom);
    expect(await fichier.content.text()).toBe(contenu);
  };

  const whenReadingWorkshopElementsInProgress = (): Promise<unknown> =>
    api.read('/api/atelier/suivis', { queryParams: { etats: ['EN_ATTENTE', 'EN_COURS'], size: PLEINE_PAGE } });

  const whenReadingOperatorsWithoutAWorkstation = (): Promise<unknown> =>
    api.read('/api/operateurs', { queryParams: { poste: undefined, size: PLEINE_PAGE } });

  const whenStartingWork = (): Promise<unknown> =>
    api.write('/api/atelier/suivis/{id}/pointages', {
      pathParams: { id: SUIVI_ID },
      body: { id: 'evenement', operateur: OPERATEUR_ID, type: 'DEBUT' },
    });

  const whenFinishingActivity = (): Promise<unknown> =>
    api.write('/api/atelier/suivis/{id}/pointages', {
      pathParams: { id: SUIVI_ID },
      body: { id: POINTAGE_ID, operateur: OPERATEUR_ID, type: 'FIN' },
    });

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

  const thenItSentTheFile = (requete: TestRequest, part: string, contenu: string): void => {
    expect(requete.request.method).toBe('PUT');
    const fichier = (requete.request.body as FormData).get(part) as File;
    expect(fichier.name).toBe(part);
    expect(fichier.size).toBe(contenu.length);
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
