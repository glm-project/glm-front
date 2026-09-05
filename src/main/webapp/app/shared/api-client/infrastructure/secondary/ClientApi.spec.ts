import { components } from '@/app/generated/schema';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ClientApi } from './ClientApi';

const SUIVI_ID = 'b7f0c2de-1f2a-4c3b-9d4e-5f6a7b8c9d0e';
const OPERATEUR_ID = '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d';
const PLEINE_PAGE = 100;
const AUCUN_POSTE = undefined;

const UNE_PAGE_DOPERATEURS = {
  content: [{ id: OPERATEUR_ID, nom: 'Dupont', prenom: 'Jean' }],
  totalElementsCount: 1,
} satisfies components['schemas']['PageRestOperateur'];

const UNE_PAGE_DE_SUIVIS = { content: [], totalElementsCount: 0 } satisfies components['schemas']['PageRestSuiviDAtelier'];

const UN_SUIVI = { id: SUIVI_ID, etat: 'EN_COURS' } satisfies components['schemas']['RestSuiviDAtelier'];

describe('ClientApi', () => {
  let api: ClientApi;
  let serveur: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), ClientApi] });
    api = TestBed.inject(ClientApi);
    serveur = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    serveur.verify();
  });

  it('should hand back what the server answered on the route it was asked for', async () => {
    const lecture = api.read('/api/operateurs', { parametres: { size: PLEINE_PAGE } });

    const requete = await whenTheServerAnswers(UNE_PAGE_DOPERATEURS);

    thenItReached(requete, '/api/operateurs?size=100');
    thenItHandedBack(await lecture, UNE_PAGE_DOPERATEURS);
  });

  it('should repeat a parameter the caller gave several values', async () => {
    const lecture = api.read('/api/atelier/suivis', { parametres: { etats: ['EN_ATTENTE', 'EN_COURS'], size: PLEINE_PAGE } });

    const requete = await whenTheServerAnswers(UNE_PAGE_DE_SUIVIS);

    thenItReached(requete, '/api/atelier/suivis?etats=EN_ATTENTE&etats=EN_COURS&size=100');
    await lecture;
  });

  it('should leave out a parameter the caller did not fill', async () => {
    const lecture = api.read('/api/operateurs', { parametres: { poste: AUCUN_POSTE, size: PLEINE_PAGE } });

    const requete = await whenTheServerAnswers(UNE_PAGE_DOPERATEURS);

    thenItReached(requete, '/api/operateurs?size=100');
    await lecture;
  });

  it('should put the path parameters the caller gave into the URL', async () => {
    const ecriture = api.write('/api/atelier/suivis/{id}/pointages', {
      chemin: { id: SUIVI_ID },
      body: { id: 'evenement', operateur: OPERATEUR_ID, type: 'DEBUT' },
    });

    const requete = await whenTheServerAnswers(UN_SUIVI);

    thenItReached(requete, `/api/atelier/suivis/${SUIVI_ID}/pointages`);
    await ecriture;
  });

  it('should send the body the caller gave to write', async () => {
    const ecriture = api.write('/api/atelier/journees/pointages', { body: { id: 'evenement', operateur: OPERATEUR_ID, type: 'PAUSE' } });

    const requete = await whenTheServerAnswers({});

    thenItSent(requete, { id: 'evenement', operateur: OPERATEUR_ID, type: 'PAUSE' });
    await ecriture;
  });

  const unTourDeBoucle = (): Promise<void> => new Promise(resolve => setTimeout(resolve));

  const whenTheServerAnswers = async (reponse: object): Promise<TestRequest> => {
    await unTourDeBoucle();

    const requete = serveur.expectOne(() => true);
    requete.flush(reponse);

    return requete;
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
