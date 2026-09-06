import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { GesteDAtelier, ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { RefusDePublication } from '@/pupitre/contexts/atelier/domain/refus/RefusDePublication';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { decideReplay, ReplayDecision } from '@/pupitre/contexts/atelier/domain/synchronisation/GesteReplayPolicy';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { HttpAtelierExchange } from './http/HttpAtelierExchange';

type RestOperateur = components['schemas']['RestOperateur'];
type RestOperateurDAtelier = components['schemas']['RestOperateurDAtelier'];
type RestPosteDAtelier = components['schemas']['RestPosteDAtelier'];
type RestSuiviDAtelier = components['schemas']['RestSuiviDAtelier'];
type RestSuiviDAtelierEnGrille = components['schemas']['RestSuiviDAtelierEnGrille'];
type UnstableReferenceKind = 'count' | 'empty' | 'duplicate' | 'overflow';

const UNSTABLE_REFERENCE_KINDS = ['count', 'empty', 'duplicate', 'overflow'] satisfies UnstableReferenceKind[];

const operateurFixture = {
  id: 'jean',
  nom: 'Dupont',
  prenom: 'Jean',
  matricule: '049',
  natures: [],
  postes: [],
} satisfies RestOperateur;
const operateurSansMatriculeFixture = {
  id: 'marie',
  nom: 'Martin',
  prenom: 'Marie',
  natures: ['tournage'],
  postes: [{ id: 'tour', libelle: 'Tour', nature: 'tournage' }],
} satisfies RestOperateur;
const operateurDAtelierFixture = { id: 'jean', nom: 'Dupont', prenom: 'Jean' } satisfies RestOperateurDAtelier;
const posteDAtelierFixture = { id: 'tour', libelle: 'Tour' } satisfies RestPosteDAtelier;
const suiviFixture = {
  activitesEnCours: [],
  element: 'element',
  engageLe: '2026-09-05T07:30:00Z',
  engagePar: 'gestionnaire',
  etat: 'EN_ATTENTE',
  id: 'piece',
  nom: 'OF-1',
  type: 'PRODUIT',
} satisfies RestSuiviDAtelierEnGrille;
const secondSuiviFixture = {
  ...suiviFixture,
  id: 'piece-2',
  activitesEnCours: [
    {
      operateur: operateurDAtelierFixture,
      categorie: 'TRAVAIL',
      depuis: '2026-09-05T08:00:00Z',
      poste: posteDAtelierFixture,
    },
    { operateur: operateurDAtelierFixture, categorie: 'NON_CONFORMITE', depuis: '2026-09-05T08:00:00Z' },
  ],
} satisfies RestSuiviDAtelierEnGrille;
const suiviDetailleFixture = { ...suiviFixture, journal: [] } satisfies RestSuiviDAtelier;
const arriveeFixture: GesteDAtelier = { nature: 'ARRIVEE', id: 'geste', dateDeSurvenue: '2026-09-05T08:00:00Z', operateurId: 'jean' };
const adapters = [['HTTP', () => TestBed.inject(HttpAtelierExchange)]] as const;
interface PageFixture {
  url: string;
  page: number;
  content: unknown[];
  totalElementsCount: number;
}

describe.each(adapters)('AtelierExchangePort contract, honoured by %s', (_adapter, build) => {
  let serveur: AtelierExchangePort;
  let http: HttpTestingController;
  let token: string | undefined;
  let referencePages: PageFixture[];

  beforeEach(() => {
    token = 'autorise';
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiClient,
        HttpAtelierExchange,
        { provide: AuthenticationPort, useValue: { currentToken: () => token } },
      ],
    });
    serveur = build();
    http = TestBed.inject(HttpTestingController);
    referencePages = [];
  });
  afterEach(() => {
    http.verify();
  });

  it('should cache all pages of operators and workshop elements without filtering by operator', async () => {
    givenCompleteReferencePagesFixture();

    const reference = whenReadingReference();

    const pages = await whenServerReturnsReferencePages();

    thenPagesHaveNoOperatorFilter(pages);
    await thenReferenceIsComplete(reference);
  });

  it.each(UNSTABLE_REFERENCE_KINDS)('should reject a partial or unstable referential (%s)', async kind => {
    const reference = whenReadingReference();

    await whenServerReturnsAnUnstableReference(kind);

    await thenItFailed(reference);
  });

  it('should refuse to mix companies when authorization changes between pages', async () => {
    const reference = whenReadingReference();

    givenAuthorizationChanges();
    await whenServerReturnsPage('/api/operateurs', 0, [operateurFixture], 2);

    await thenItFailed(reference);
  });

  it('should make no referential request without authorization', async () => {
    givenNoAuthorization();

    const reference = whenReadingReference();

    await thenItFailed(reference);
  });

  it('should preserve event identity and original business time on each write route', async () => {
    const arrivee = whenSending(arriveeFixture);
    const arriveeRequest = await whenServerAcceptsWrite('/api/atelier/journees');
    await thenWriteSucceededWith(arrivee, arriveeRequest, {
      id: 'geste',
      dateDeSurvenue: arriveeFixture.dateDeSurvenue,
      operateur: 'jean',
    });

    const presence = whenSending({ ...arriveeFixture, nature: 'PRESENCE', type: 'PAUSE', implicite: false });
    const presenceRequest = await whenServerAcceptsWrite('/api/atelier/journees/pointages');
    await thenWriteSucceededWith(presence, presenceRequest, {
      id: 'geste',
      dateDeSurvenue: arriveeFixture.dateDeSurvenue,
      operateur: 'jean',
      type: 'PAUSE',
    });

    const pointage = whenSending({ ...arriveeFixture, nature: 'POINTAGE', suiviId: 'piece', type: 'DEBUT', posteId: 'tour' });
    const pointageRequest = await whenServerAcceptsWrite('/api/atelier/suivis/piece/pointages');
    await thenWriteSucceededWith(pointage, pointageRequest, {
      id: 'geste',
      dateDeSurvenue: arriveeFixture.dateDeSurvenue,
      operateur: 'jean',
      type: 'DEBUT',
      poste: 'tour',
    });

    const pointageSansPoste = whenSending({ ...arriveeFixture, nature: 'POINTAGE', suiviId: 'piece', type: 'FIN' });
    const pointageSansPosteRequest = await whenServerAcceptsWrite('/api/atelier/suivis/piece/pointages');
    await thenWriteSucceededWith(pointageSansPoste, pointageSansPosteRequest, {
      id: 'geste',
      dateDeSurvenue: arriveeFixture.dateDeSurvenue,
      operateur: 'jean',
      type: 'FIN',
    });
  });

  it('should expose every stable business refusal, including codes outside the old allowlist', async () => {
    const refused = whenSending(arriveeFixture);

    await whenServerRefusesWrite('urn:glm:erreur:atelier:identifiant-evenement-reutilise', 'collision');

    await thenBusinessRefusalIs(refused);
  });

  it.each<[string, ReplayDecision]>([
    ['urn:glm:erreur:atelier:saisie-concurrente', 'RELIRE_ET_REJOUER'],
    ['urn:glm:erreur:atelier:journee-de-travail-deja-ouverte', 'ACCEPTER'],
    ['urn:glm:erreur:autre:saisie-concurrente', 'PROPAGER'],
    ['urn:glm:erreur:atelier:identifiant-evenement-reutilise', 'PROPAGER'],
  ])('should supply a domain refusal allowing %s to decide %s', async (code, decision) => {
    const refused = whenSending(arriveeFixture);

    await whenServerRefusesWrite(code, 'cause');

    await thenReplayDecisionIs(refused, code, decision);
  });

  it('should preserve a transport failure as a retryable failure', async () => {
    const refused = whenSending(arriveeFixture);

    await whenTransportFails();

    await thenTransportFailureIs(refused);
  });

  it('should reread the affected aggregate before the caller replays a concurrent gesture', async () => {
    const presence = whenRereading(arriveeFixture);

    const operatorDayRequest = await whenServerReturnsOperatorDay();

    thenItRequestedTheOperatorDay(operatorDayRequest);
    await thenRereadCompletes(presence);

    const pointage = whenRereading({ ...arriveeFixture, nature: 'POINTAGE', suiviId: 'piece', type: 'FIN' });

    const workshopElementRequest = await whenServerReturnsWorkshopElement();

    thenItRequestedTheWorkshopElement(workshopElementRequest);
    await thenRereadCompletes(pointage);
  });

  const givenAuthorizationChanges = (): void => {
    token = 'autre-entreprise';
  };
  const givenNoAuthorization = (): void => {
    token = undefined;
  };
  const givenCompleteReferencePagesFixture = (): void => {
    referencePages = [
      { url: '/api/operateurs', page: 0, content: [operateurFixture], totalElementsCount: 2 },
      { url: '/api/operateurs', page: 1, content: [operateurSansMatriculeFixture], totalElementsCount: 2 },
      { url: '/api/atelier/suivis', page: 0, content: [suiviFixture], totalElementsCount: 2 },
      { url: '/api/atelier/suivis', page: 1, content: [secondSuiviFixture], totalElementsCount: 2 },
    ];
  };
  const observeRejection = <T>(operation: Promise<T>): Promise<T> => {
    void operation.catch(() => undefined);
    return operation;
  };
  const whenReadingReference = (): Promise<ReferentielDuPupitre> => observeRejection(serveur.referentiel());
  const whenSending = (geste: GesteDAtelier): Promise<void> => observeRejection(serveur.send(geste));
  const whenRereading = (geste: GesteDAtelier): Promise<void> => serveur.reread(geste);
  const whenServerReturnsReferencePages = async (): Promise<TestRequest[]> => {
    const requests: TestRequest[] = [];
    for (const page of referencePages) {
      requests.push(await whenServerReturnsPage(page.url, page.page, page.content, page.totalElementsCount));
    }
    return requests;
  };
  const whenServerReturnsAnUnstableReference = async (kind: UnstableReferenceKind): Promise<void> => {
    await whenServerReturnsPage('/api/operateurs', 0, [operateurFixture], 2);
    const unstablePages: Record<UnstableReferenceKind, PageFixture> = {
      count: { url: '/api/operateurs', page: 1, content: [{ ...operateurFixture, id: 'marie' }], totalElementsCount: 3 },
      empty: { url: '/api/operateurs', page: 1, content: [], totalElementsCount: 2 },
      duplicate: { url: '/api/operateurs', page: 1, content: [operateurFixture], totalElementsCount: 2 },
      overflow: {
        url: '/api/operateurs',
        page: 1,
        content: [
          { ...operateurFixture, id: 'marie' },
          { ...operateurFixture, id: 'paul' },
        ],
        totalElementsCount: 2,
      },
    };
    const page = unstablePages[kind];
    await whenServerReturnsPage(page.url, page.page, page.content, page.totalElementsCount);
  };
  const whenServerReturnsPage = async (
    url: string,
    page: number,
    content: unknown[],
    totalElementsCount: number,
  ): Promise<ReturnType<HttpTestingController['expectOne']>> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = http.expectOne(request => request.url === url && request.params.get('page') === String(page));
    request.flush({ content, currentPage: page, pageSize: 100, totalElementsCount });
    return request;
  };
  const whenServerAcceptsWrite = async (url: string): Promise<ReturnType<HttpTestingController['expectOne']>> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = http.expectOne(url);
    request.flush({}, { status: 200, statusText: 'Replay accepted' });
    return request;
  };
  const whenServerRefusesWrite = async (code: string, message: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    http.expectOne('/api/atelier/journees').flush({ type: code, message }, { status: 409, statusText: 'Conflict' });
  };
  const whenTransportFails = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    http.expectOne('/api/atelier/journees').error(new ProgressEvent('error'));
  };
  const whenServerReturnsOperatorDay = async (): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = http.expectOne(request => request.url === '/api/atelier/journees');
    request.flush({ content: [], currentPage: 0, pageSize: 100, totalElementsCount: 0 });
    return request;
  };
  const whenServerReturnsWorkshopElement = async (): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = http.expectOne('/api/atelier/suivis/piece');
    request.flush(suiviDetailleFixture);
    return request;
  };
  const thenPagesHaveNoOperatorFilter = (pages: TestRequest[]): void => {
    pages.forEach(page => {
      expect(page.request.params.has('operateur')).toBe(false);
    });
  };
  const thenWriteSucceededWith = async (
    write: Promise<void>,
    request: ReturnType<HttpTestingController['expectOne']>,
    body: unknown,
  ): Promise<void> => {
    expect(request.request.body).toEqual(body);
    await expect(write).resolves.toBeUndefined();
  };
  const thenReferenceIsComplete = async (operation: Promise<ReferentielDuPupitre>): Promise<void> => {
    const reference = await operation;
    expect(reference.operateurs).toHaveLength(2);
    const secondOperator = requiredFixture(reference.operateurs[1], 'second operator');
    expect(secondOperator.postes).toEqual([{ id: 'tour', libelle: 'Tour' }]);
    expect(secondOperator.matricule).toBeUndefined();
    expect(reference.suivis).toHaveLength(2);
    const activities = requiredFixture(reference.suivis[1], 'second workshop element').activites;
    expect(requiredFixture(activities[0], 'workstation activity').posteId).toBe('tour');
    expect(requiredFixture(activities[1], 'activity without workstation').posteId).toBeUndefined();
  };
  const thenItFailed = async (operation: Promise<unknown>): Promise<void> => {
    await expect(operation).rejects.toBeInstanceOf(Error);
  };
  const thenBusinessRefusalIs = async (operation: Promise<unknown>): Promise<void> => {
    const failure = await operation.catch((reason: unknown) => reason);
    expect(failure).toBeInstanceOf(RefusDePublication);
    expect(failure).toMatchObject({ code: 'urn:glm:erreur:atelier:identifiant-evenement-reutilise', message: 'collision' });
  };
  const thenReplayDecisionIs = async (operation: Promise<unknown>, code: string, decision: ReplayDecision): Promise<void> => {
    const failure = await operation.catch((reason: unknown) => reason);
    expect(decideReplay('ARRIVEE_ASSUREE', failure)).toBe(decision);
    expect(failure).toMatchObject({ code, message: 'cause' });
  };
  const thenTransportFailureIs = async (operation: Promise<unknown>): Promise<void> => {
    const failure = await operation.catch((reason: unknown) => reason);
    expect(failure).not.toBeInstanceOf(RefusDePublication);
    expect(failure).toMatchObject({ status: 0 });
  };
  const thenItRequestedTheOperatorDay = (request: TestRequest): void => {
    expect(request.request.params.get('operateur')).toBe('jean');
  };
  const thenItRequestedTheWorkshopElement = (request: TestRequest): void => {
    expect(request.request.url).toBe('/api/atelier/suivis/piece');
  };
  const thenRereadCompletes = async (reread: Promise<void>): Promise<void> => {
    await expect(reread).resolves.toBeUndefined();
  };
});
