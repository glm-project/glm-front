import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { GesteDAtelier, ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { RefusDePublication } from '@/pupitre/contexts/atelier/domain/refus/RefusDePublication';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { decideReplay, ReplayDecision } from '@/pupitre/contexts/atelier/domain/synchronisation/GesteReplayPolicy';
import { Result } from '@/pupitre/contexts/atelier/domain/synchronisation/Result';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpAtelierExchange } from './http/HttpAtelierExchange';

type RestOperateurDuPupitre = components['schemas']['RestOperateurDuPupitre'];
type RestReferentielDuPupitre = components['schemas']['RestReferentielDuPupitre'];
type RestSuiviDAtelier = components['schemas']['RestSuiviDAtelier'];
type RestSuiviDAtelierEnGrille = components['schemas']['RestSuiviDAtelierEnGrille'];
type RestSuiviDuPupitre = components['schemas']['RestSuiviDuPupitre'];

const operateurFixture = {
  id: 'jean',
  nom: 'Dupont',
  prenom: 'Jean',
  matricule: '049',
  etat: 'EN_PAUSE',
  postes: [],
} satisfies RestOperateurDuPupitre;
const operateurSansMatriculeFixture = {
  id: 'marie',
  nom: 'Martin',
  prenom: 'Marie',
  etat: 'ABSENT',
  postes: [{ id: 'tour', libelle: 'Tour' }],
} satisfies RestOperateurDuPupitre;
const suiviSansReferenceFixture = {
  activites: [],
  etat: 'EN_ATTENTE',
  id: 'piece',
  nom: 'PR-2026-000001',
  type: 'PRODUIT',
} satisfies RestSuiviDuPupitre;
const suiviAvecReferenceFixture = {
  ...suiviSansReferenceFixture,
  id: 'piece-2',
  nom: 'PR-2026-000002',
  reference: 'M-1187',
  activites: [
    { operateur: 'jean', categorie: 'TRAVAIL', depuis: '2026-09-05T08:00:00Z', poste: 'tour' },
    { operateur: 'jean', categorie: 'NON_CONFORMITE', depuis: '2026-09-05T08:00:00Z' },
  ],
} satisfies RestSuiviDuPupitre;
const referentielFixture = {
  genereLe: '2026-09-05T08:05:00Z',
  operateurs: [operateurFixture, operateurSansMatriculeFixture],
  suivis: [suiviSansReferenceFixture, suiviAvecReferenceFixture],
} satisfies RestReferentielDuPupitre;
const suiviDetailleFixture = {
  activitesEnCours: [],
  element: 'element',
  engageLe: '2026-09-05T07:30:00Z',
  engagePar: 'gestionnaire',
  etat: 'EN_ATTENTE',
  id: 'piece',
  journal: [],
  nom: 'OF-1',
  type: 'PRODUIT',
} satisfies RestSuiviDAtelier & RestSuiviDAtelierEnGrille;
const arriveeFixture: GesteDAtelier = { nature: 'ARRIVEE', id: 'geste', dateDeSurvenue: '2026-09-05T08:00:00Z', operateurId: 'jean' };
const adapters = [['HTTP', () => TestBed.inject(HttpAtelierExchange)]] as const;

describe.each(adapters)('AtelierExchangePort contract, honoured by %s', (_adapter, build) => {
  let serveur: AtelierExchangePort;
  let http: HttpTestingController;
  let token: string | undefined;

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
  });
  afterEach(() => {
    http.verify();
  });

  it('should read the whole pupitre reference in a single unbounded request', async () => {
    const reference = whenReadingReference();

    const request = await whenServerReturnsTheReference();

    thenItAskedForTheWholeReference(request);
    await thenReferenceIsComplete(reference);
  });

  it('should make no referential request without authorization', async () => {
    givenNoAuthorization();

    const reference = whenReadingReference();

    await thenItFailed(reference, 'Aucune autorisation pour lire le référentiel.');
  });

  it('should preserve event identity and original business time on each write route', async () => {
    const arrivee = whenSending(arriveeFixture);
    const arriveeRequest = await whenServerAcceptsWrite('/api/atelier/journees');

    const presence = whenSending({
      ...arriveeFixture,
      nature: 'PRESENCE',
      type: 'REPRISE',
      implicite: false,
      assuranceArriveeId: 'arrivee-assuree',
    });
    const presenceRequest = await whenServerAcceptsWrite('/api/atelier/journees/pointages');

    const pointage = whenSending({ ...arriveeFixture, nature: 'POINTAGE', suiviId: 'piece', type: 'DEBUT', posteId: 'tour' });
    const pointageRequest = await whenServerAcceptsWrite('/api/atelier/suivis/piece/pointages');

    const pointageSansPoste = whenSending({ ...arriveeFixture, nature: 'POINTAGE', suiviId: 'piece', type: 'FIN' });
    const pointageSansPosteRequest = await whenServerAcceptsWrite('/api/atelier/suivis/piece/pointages');

    await thenWriteSucceededWith(arrivee, arriveeRequest, {
      id: 'geste',
      dateDeSurvenue: arriveeFixture.dateDeSurvenue,
      operateur: 'jean',
    });
    await thenWriteSucceededWith(presence, presenceRequest, {
      id: 'geste',
      dateDeSurvenue: arriveeFixture.dateDeSurvenue,
      operateur: 'jean',
      type: 'REPRISE',
    });
    await thenWriteSucceededWith(pointage, pointageRequest, {
      id: 'geste',
      dateDeSurvenue: arriveeFixture.dateDeSurvenue,
      operateur: 'jean',
      type: 'DEBUT',
      poste: 'tour',
    });
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

  it('should reread the operator day before replaying presence', async () => {
    const presence = whenRereading(arriveeFixture);
    const operatorDayRequest = await whenServerReturnsOperatorDay();

    thenItRequestedTheOperatorDay(operatorDayRequest);
    await thenRereadCompletes(presence);
  });

  it('should reread the workshop element before replaying pointage', async () => {
    const pointage = whenRereading({ ...arriveeFixture, nature: 'POINTAGE', suiviId: 'piece', type: 'FIN' });
    const workshopElementRequest = await whenServerReturnsWorkshopElement();

    thenItRequestedTheWorkshopElement(workshopElementRequest);
    await thenRereadCompletes(pointage);
  });

  const givenNoAuthorization = (): void => {
    token = undefined;
  };
  const observeRejection = <T>(operation: Promise<T>): Promise<T> => {
    void operation.catch(() => undefined);
    return operation;
  };
  const whenReadingReference = (): Promise<ReferentielDuPupitre> => observeRejection(serveur.referentiel());
  const whenSending = (geste: GesteDAtelier): Promise<Result<void, RefusDePublication>> => observeRejection(serveur.send(geste));
  const whenRereading = (geste: GesteDAtelier): Promise<void> => serveur.reread(geste);
  const whenServerReturnsTheReference = async (): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = http.expectOne('/api/pupitre/referentiel');
    request.flush(referentielFixture);
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
  const thenItAskedForTheWholeReference = (request: TestRequest): void => {
    expect(request.request.params.keys()).toEqual([]);
  };
  const thenWriteSucceededWith = async (
    write: Promise<Result<void, RefusDePublication>>,
    request: ReturnType<HttpTestingController['expectOne']>,
    body: unknown,
  ): Promise<void> => {
    expect(request.request.body).toEqual(body);
    await expect(write).resolves.toEqual({ ok: true, value: undefined });
  };
  const thenReferenceIsComplete = async (operation: Promise<ReferentielDuPupitre>): Promise<void> => {
    const reference = await operation;
    expect(reference.operateurs).toEqual([
      { id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', etat: 'EN_PAUSE', postes: [], evenements: [] },
      { id: 'marie', nom: 'Martin', prenom: 'Marie', etat: 'ABSENT', postes: [{ id: 'tour', libelle: 'Tour' }], evenements: [] },
    ]);
    expect(reference.suivis[0]).toEqual({
      id: 'piece',
      nom: 'PR-2026-000001',
      etat: 'EN_ATTENTE',
      type: 'PRODUIT',
      activites: [],
      evenements: [],
    });
    expect(reference.suivis[1]).toEqual({
      id: 'piece-2',
      nom: 'PR-2026-000002',
      reference: 'M-1187',
      etat: 'EN_ATTENTE',
      type: 'PRODUIT',
      activites: [
        { operateurId: 'jean', categorie: 'TRAVAIL', depuis: '2026-09-05T08:00:00Z', posteId: 'tour' },
        { operateurId: 'jean', categorie: 'NON_CONFORMITE', depuis: '2026-09-05T08:00:00Z' },
      ],
      evenements: [],
    });
  };
  const thenItFailed = async (operation: Promise<unknown>, expectedMessage?: string): Promise<void> => {
    if (expectedMessage !== undefined) {
      await expect(operation).rejects.toThrow(expectedMessage);
    } else {
      await expect(operation).rejects.toBeInstanceOf(Error);
    }
  };
  const thenBusinessRefusalIs = async (operation: Promise<Result<void, RefusDePublication>>): Promise<void> => {
    const result = await operation;
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ error: { code: 'urn:glm:erreur:atelier:identifiant-evenement-reutilise', message: 'collision' } });
  };
  const thenReplayDecisionIs = async (
    operation: Promise<Result<void, RefusDePublication>>,
    code: string,
    decision: ReplayDecision,
  ): Promise<void> => {
    const result = await operation;
    const refusal = result.ok ? undefined : result.error;
    expect(decideReplay('ARRIVEE_ASSUREE', refusal)).toBe(decision);
    expect(refusal).toMatchObject({ code, message: 'cause' });
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
