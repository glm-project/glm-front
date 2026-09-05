import { GesteLocal, ReferentielDuPupitre } from '@/app/atelier/domain/PupitreLocal';
import { RefusDuPupitre } from '@/app/atelier/domain/RefusDuPupitre';
import { ServeurDuPupitrePort } from '@/app/atelier/domain/ServeurDuPupitrePort';
import { ClientApi } from '@/app/shared/api-client/infrastructure/secondary/ClientApi';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpServeurDuPupitre } from './http/HttpServeurDuPupitre';

const operateurFixture = { id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049' };
const suiviFixture = { id: 'piece', nom: 'OF-1', etat: 'EN_ATTENTE', type: 'PRODUIT' };
const arriveeFixture: GesteLocal = { nature: 'ARRIVEE', id: 'geste', dateDeSurvenue: '2026-09-05T08:00:00Z', operateurId: 'jean' };
const adapters = [['HTTP', () => TestBed.inject(HttpServeurDuPupitre)]] as const;

describe.each(adapters)('ServeurDuPupitrePort contract, honoured by %s', (_adapter, build) => {
  let serveur: ServeurDuPupitrePort;
  let http: HttpTestingController;
  let token: string | undefined;

  beforeEach(() => {
    token = 'autorise';
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ClientApi,
        HttpServeurDuPupitre,
        { provide: AuthenticationPort, useValue: { currentToken: () => token } },
      ],
    });
    serveur = build();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('should cache all pages of operators and workshop elements without filtering by operator', async () => {
    const reference = serveur.referentiel();

    await whenPage('/api/operateurs', 0, [operateurFixture], 2);
    await whenPage('/api/operateurs', 1, [{ ...operateurFixture, id: 'marie', postes: [{ id: 'tour', libelle: 'Tour' }] }], 2);
    await whenPage('/api/atelier/suivis', 0, [suiviFixture], 2);
    await whenPage(
      '/api/atelier/suivis',
      1,
      [
        {
          ...suiviFixture,
          id: 'piece-2',
          journal: [{ id: 'ancien' }],
          activitesEnCours: [
            { operateur: operateurFixture, categorie: 'TRAVAIL', depuis: '2026-09-05T08:00:00Z', poste: { id: 'tour' } },
            { operateur: operateurFixture, categorie: 'NON_CONFORMITE', depuis: '2026-09-05T08:00:00Z' },
          ],
        },
      ],
      2,
    );

    thenReferenceIsComplete(await reference);
  });

  it.each(['count', 'empty', 'duplicate', 'overflow'])('should reject a partial or unstable referential (%s)', async kind => {
    const reference = serveur.referentiel();
    const rejected = reference.catch((failure: unknown) => failure);

    await whenPage('/api/operateurs', 0, [operateurFixture], 2);
    if (kind === 'count') {
      await whenPage('/api/operateurs', 1, [{ ...operateurFixture, id: 'marie' }], 3);
    }
    if (kind === 'empty') {
      await whenPage('/api/operateurs', 1, [], 2);
    }
    if (kind === 'duplicate') {
      await whenPage('/api/operateurs', 1, [operateurFixture], 2);
    }
    if (kind === 'overflow') {
      await whenPage(
        '/api/operateurs',
        1,
        [
          { ...operateurFixture, id: 'marie' },
          { ...operateurFixture, id: 'paul' },
        ],
        2,
      );
    }

    thenItFailed(await rejected);
  });

  it('should refuse to mix companies when authorization changes between pages', async () => {
    const reference = serveur.referentiel().catch((failure: unknown) => failure);

    token = 'autre-entreprise';
    await whenPage('/api/operateurs', 0, [operateurFixture], 2);

    thenItFailed(await reference);
  });

  it('should make no referential request without authorization', async () => {
    token = undefined;

    const reference = serveur.referentiel().catch((failure: unknown) => failure);

    thenItFailed(await reference);
  });

  it('should preserve event identity and original business time on each write route', async () => {
    const arrivee = serveur.send(arriveeFixture);
    await whenWrite('/api/atelier/journees', { id: 'geste', dateDeSurvenue: arriveeFixture.dateDeSurvenue, operateur: 'jean' });
    await arrivee;
    const presence = serveur.send({ ...arriveeFixture, nature: 'PRESENCE', type: 'PAUSE', implicite: false });
    await whenWrite('/api/atelier/journees/pointages', {
      id: 'geste',
      dateDeSurvenue: arriveeFixture.dateDeSurvenue,
      operateur: 'jean',
      type: 'PAUSE',
    });
    await presence;
    const pointage = serveur.send({ ...arriveeFixture, nature: 'POINTAGE', suiviId: 'piece', type: 'DEBUT', posteId: 'tour' });
    await whenWrite('/api/atelier/suivis/piece/pointages', {
      id: 'geste',
      dateDeSurvenue: arriveeFixture.dateDeSurvenue,
      operateur: 'jean',
      type: 'DEBUT',
      poste: 'tour',
    });
    await pointage;
  });

  it('should expose every stable business refusal, including codes outside the old allowlist', async () => {
    const refused = serveur.send(arriveeFixture).catch((failure: unknown) => failure);

    http
      .expectOne('/api/atelier/journees')
      .flush(
        { type: 'urn:glm:erreur:atelier:identifiant-evenement-reutilise', message: 'collision' },
        { status: 409, statusText: 'Conflict' },
      );

    thenBusinessRefusalIs(await refused);
  });

  it('should preserve a transport failure as a retryable failure', async () => {
    const refused = serveur.send(arriveeFixture).catch((failure: unknown) => failure);

    http.expectOne('/api/atelier/journees').error(new ProgressEvent('error'));

    thenTransportFailureIs(await refused);
  });

  it('should reread the affected aggregate before the caller replays a concurrent gesture', async () => {
    const presence = serveur.reread(arriveeFixture);
    http.expectOne(request => request.url === '/api/atelier/journees' && request.params.get('operateur') === 'jean').flush({ content: [] });
    await presence;
    const pointage = serveur.reread({ ...arriveeFixture, nature: 'POINTAGE', suiviId: 'piece', type: 'FIN' });
    http.expectOne('/api/atelier/suivis/piece').flush(suiviFixture);
    await pointage;
  });

  const whenPage = async (url: string, page: number, content: unknown[], totalElementsCount: number): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = http.expectOne(request => request.url === url && request.params.get('page') === String(page));
    expect(request.request.params.has('operateur')).toBe(false);
    request.flush({ content, totalElementsCount });
  };
  const whenWrite = async (url: string, body: unknown): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = http.expectOne(url);
    expect(request.request.body).toEqual(body);
    request.flush({}, { status: 200, statusText: 'Replay accepted' });
  };
  const thenReferenceIsComplete = (reference: ReferentielDuPupitre): void => {
    expect(reference.operateurs).toHaveLength(2);
    expect(reference.operateurs[1].postes).toEqual([{ id: 'tour', libelle: 'Tour' }]);
    expect(reference.suivis).toHaveLength(2);
    expect(reference.suivis[1].evenements).toEqual(['ancien']);
    expect(reference.suivis[1].activites[0].posteId).toBe('tour');
    expect(reference.suivis[1].activites[1].posteId).toBeUndefined();
  };
  const thenItFailed = (failure: unknown): void => {
    expect(failure).toBeInstanceOf(Error);
  };
  const thenBusinessRefusalIs = (failure: unknown): void => {
    expect(failure).toBeInstanceOf(RefusDuPupitre);
    expect(failure).toMatchObject({ code: 'urn:glm:erreur:atelier:identifiant-evenement-reutilise', message: 'collision' });
  };
  const thenTransportFailureIs = (failure: unknown): void => {
    expect(failure).not.toBeInstanceOf(RefusDuPupitre);
    expect(failure).toMatchObject({ status: 0 });
  };
});
