import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { GesteDePointage, ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { RefusDePublication } from '@/pupitre/contexts/atelier/domain/refus/RefusDePublication';
import { AtelierExchangePort, PublicationAcceptee } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
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
  identifiant: '049',
  postes: [],
} satisfies RestOperateurDuPupitre;
const operateurSansIdentifiantFixture = {
  id: 'marie',
  nom: 'Martin',
  prenom: 'Marie',
  postes: [{ id: 'tour', libelle: 'Tour' }],
} satisfies RestOperateurDuPupitre;
const suiviSansReferenceFixture = {
  conflits: [],
  activites: [],
  etat: 'EN_ATTENTE',
  id: 'piece',
  nom: 'PR-2026-000001',
  categorie: 'MOULE',
  type: 'PRODUIT',
} satisfies RestSuiviDuPupitre;
const suiviAvecReferenceFixture = {
  ...suiviSansReferenceFixture,
  id: 'piece-2',
  nom: 'PR-2026-000002',
  reference: 'M-1187',
  activites: [
    {
      ouverture: 'activite-fixture-36',
      echeance: '2026-09-05T21:00:00.000Z',
      operateur: 'jean',
      categorie: 'TRAVAIL',
      depuis: '2026-09-05T08:00:00Z',
      poste: 'tour',
    },
    {
      ouverture: 'activite-fixture-37',
      echeance: '2026-09-05T21:00:00.000Z',
      operateur: 'jean',
      categorie: 'NON_CONFORMITE',
      depuis: '2026-09-05T08:00:00Z',
    },
  ],
  conflits: [
    { operateur: 'jean', activites: [], pointages: ['conflit-reference'] },
    { operateur: 'marie', poste: 'tour', activites: ['remplacante'], pointages: ['fin'] },
  ],
} satisfies RestSuiviDuPupitre;
const referentielFixture = {
  genereLe: '2026-09-05T08:05:00Z',
  operateurs: [operateurFixture, operateurSansIdentifiantFixture],
  suivis: [suiviSansReferenceFixture, suiviAvecReferenceFixture],
  categories: ['MOULE', 'OF'],
} satisfies RestReferentielDuPupitre;
const suiviDetailleFixture = {
  conflits: [],
  activitesEnCours: [],
  element: 'element',
  engageLe: '2026-09-05T07:30:00Z',
  engagePar: 'gestionnaire',
  etat: 'EN_ATTENTE',
  id: 'piece',
  journal: [],
  nom: 'OF-1',
  categorie: 'MOULE',
  type: 'PRODUIT',
} satisfies RestSuiviDAtelier & RestSuiviDAtelierEnGrille;
const ouvertureFixture: GesteDePointage = {
  nature: 'POINTAGE',
  id: 'geste',
  dateDeSurvenue: '2026-09-05T08:00:00Z',
  operateurId: 'jean',
  suiviId: 'piece',
  intention: 'OUVERTURE',
  type: 'DEBUT',
};
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

  it.each<GesteDePointage>([
    { ...ouvertureFixture, type: 'DEBUT' },
    { ...ouvertureFixture, type: 'NON_CONFORMITE', posteId: 'tour' },
    { ...ouvertureFixture, intention: 'TRANSITION', type: 'NON_CONFORMITE', cible: 'opening', posteId: 'tour' },
    { ...ouvertureFixture, intention: 'FIN', type: 'FIN', cible: 'opening' },
  ])('should preserve captured identity, occurrence, intention and target for $intention $type', async geste => {
    const sent = whenSending(geste);

    const request = await whenServerAcceptsWrite('/api/atelier/suivis/piece/pointages');

    await thenWriteSucceededWith(sent, request, {
      id: 'geste',
      dateDeSurvenue: '2026-09-05T08:00:00Z',
      operateur: 'jean',
      type: geste.type,
      intention: geste.intention,
      ...(geste.intention === 'OUVERTURE' ? {} : { cible: 'opening' }),
      ...(geste.posteId === undefined ? {} : { poste: 'tour' }),
    });
  });

  it.each([200, 201])('should retain conflict diagnostics from an accepted publication with status %s', async status => {
    const sent = whenSending(ouvertureFixture);

    await whenServerAcceptsConflict([{ activites: ['ancienne-ouverture', 'remplacante'], pointages: ['geste'] }], status);

    await expect(sent).resolves.toEqual({
      ok: true,
      value: {
        conflits: [{ activites: ['ancienne-ouverture', 'remplacante'], pointages: ['geste'] }],
      },
    });
  });

  it('should translate resolved operator and workstation identities from publication conflicts', async () => {
    const sent = whenSending(ouvertureFixture);

    await whenServerAcceptsConflict([
      {
        operateur: { id: 'jean', nom: 'Dupont', prenom: 'Jean' },
        poste: { id: 'tour', libelle: 'Tour' },
        activites: [],
        pointages: ['geste'],
      },
    ]);

    await expect(sent).resolves.toEqual({
      ok: true,
      value: { conflits: [{ operateurId: 'jean', posteId: 'tour', activites: [], pointages: ['geste'] }] },
    });
  });

  it('should never send the pause a finish belongs to, the pause living on the pupitre', async () => {
    const fin = whenSending({
      ...ouvertureFixture,
      nature: 'POINTAGE',
      suiviId: 'piece',
      type: 'FIN',
      posteId: 'tour',
      suspension: { pause: 'pause-de-midi', reouverture: 'DEBUT' },
      intention: 'FIN',
      cible: 'activite-fixture-40',
    });
    const request = await whenServerAcceptsWrite('/api/atelier/suivis/piece/pointages');

    await thenWriteSucceededWith(fin, request, {
      id: 'geste',
      dateDeSurvenue: ouvertureFixture.dateDeSurvenue,
      operateur: 'jean',
      type: 'FIN',
      intention: 'FIN',
      cible: 'activite-fixture-40',
      poste: 'tour',
    });
  });

  it('should expose every stable business refusal, including codes outside the old allowlist', async () => {
    const refused = whenSending(ouvertureFixture);

    await whenServerRefusesWrite('urn:glm:erreur:atelier:identifiant-evenement-reutilise', 'collision');

    await thenBusinessRefusalIs(refused);
  });

  it.each<[string, ReplayDecision]>([
    ['urn:glm:erreur:atelier:saisie-concurrente', 'RELIRE_ET_REJOUER'],
    ['urn:glm:erreur:atelier:activite-visee-introuvable', 'PROPAGER'],
    ['urn:glm:erreur:atelier:activite-visee-incoherente', 'PROPAGER'],
    ['urn:glm:erreur:autre:saisie-concurrente', 'PROPAGER'],
    ['urn:glm:erreur:atelier:identifiant-evenement-reutilise', 'PROPAGER'],
  ])('should supply a domain refusal allowing %s to decide %s', async (code, decision) => {
    const refused = whenSending(ouvertureFixture);

    await whenServerRefusesWrite(code, 'cause');

    await thenReplayDecisionIs(refused, code, decision);
  });

  it('should preserve a transport failure as a retryable failure', async () => {
    const refused = whenSending(ouvertureFixture);

    await whenTransportFails();

    await thenTransportFailureIs(refused);
  });

  it('should reread the workshop element before replaying pointage', async () => {
    const pointage = whenRereading({
      ...ouvertureFixture,
      nature: 'POINTAGE',
      suiviId: 'piece',
      type: 'FIN',
      intention: 'FIN',
      cible: 'activite-fixture-41',
    });
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
  const whenSending = (geste: GesteDePointage): Promise<Result<PublicationAcceptee, RefusDePublication>> =>
    observeRejection(serveur.send(geste));
  const whenRereading = (geste: GesteDePointage): Promise<void> => serveur.reread(geste);
  const whenServerReturnsTheReference = async (): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = http.expectOne('/api/pupitre/referentiel');
    request.flush(referentielFixture);
    return request;
  };
  const whenServerAcceptsConflict = async (conflits: RestSuiviDAtelier['conflits'], status = 200): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    http
      .expectOne('/api/atelier/suivis/piece/pointages')
      .flush({ ...suiviDetailleFixture, conflits } satisfies RestSuiviDAtelier, { status, statusText: 'Accepted' });
  };
  const whenServerAcceptsWrite = async (url: string): Promise<ReturnType<HttpTestingController['expectOne']>> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = http.expectOne(url);
    request.flush(suiviDetailleFixture, { status: 200, statusText: 'Replay accepted' });
    return request;
  };
  const whenServerRefusesWrite = async (code: string, message: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    http.expectOne('/api/atelier/suivis/piece/pointages').flush({ type: code, message }, { status: 409, statusText: 'Conflict' });
  };
  const whenTransportFails = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    http.expectOne('/api/atelier/suivis/piece/pointages').error(new ProgressEvent('error'));
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
    write: Promise<Result<PublicationAcceptee, RefusDePublication>>,
    request: ReturnType<HttpTestingController['expectOne']>,
    body: unknown,
  ): Promise<void> => {
    expect(request.request.body).toEqual(body);
    await expect(write).resolves.toEqual({ ok: true, value: { conflits: [] } });
  };
  const thenReferenceIsComplete = async (operation: Promise<ReferentielDuPupitre>): Promise<void> => {
    const reference = await operation;
    expect(reference.operateurs).toEqual([
      { id: 'jean', nom: 'Dupont', prenom: 'Jean', identifiant: '049', postes: [] },
      { id: 'marie', nom: 'Martin', prenom: 'Marie', postes: [{ id: 'tour', libelle: 'Tour' }] },
    ]);
    expect(reference.suivis[0]).toEqual({
      conflits: [],
      id: 'piece',
      nom: 'PR-2026-000001',
      etat: 'EN_ATTENTE',
      categorie: 'MOULE',
      activites: [],
      evenements: [],
    });
    expect(reference.suivis[1]).toEqual({
      conflits: [
        { operateurId: 'jean', activites: [], pointages: ['conflit-reference'] },
        { operateurId: 'marie', posteId: 'tour', activites: ['remplacante'], pointages: ['fin'] },
      ],
      id: 'piece-2',
      nom: 'PR-2026-000002',
      reference: 'M-1187',
      etat: 'EN_ATTENTE',
      categorie: 'MOULE',
      activites: [
        {
          ouverture: 'activite-fixture-36',
          echeance: '2026-09-05T21:00:00.000Z',
          operateurId: 'jean',
          categorie: 'TRAVAIL',
          depuis: '2026-09-05T08:00:00Z',
          posteId: 'tour',
        },
        {
          ouverture: 'activite-fixture-37',
          echeance: '2026-09-05T21:00:00.000Z',
          operateurId: 'jean',
          categorie: 'NON_CONFORMITE',
          depuis: '2026-09-05T08:00:00Z',
        },
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
  const thenBusinessRefusalIs = async (operation: Promise<Result<PublicationAcceptee, RefusDePublication>>): Promise<void> => {
    const result = await operation;
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ error: { code: 'urn:glm:erreur:atelier:identifiant-evenement-reutilise', message: 'collision' } });
  };
  const thenReplayDecisionIs = async (
    operation: Promise<Result<PublicationAcceptee, RefusDePublication>>,
    code: string,
    decision: ReplayDecision,
  ): Promise<void> => {
    const result = await operation;
    const refusal = result.ok ? undefined : result.error;
    expect(decideReplay(refusal)).toBe(decision);
    expect(refusal).toMatchObject({ code, message: 'cause' });
  };
  const thenTransportFailureIs = async (operation: Promise<unknown>): Promise<void> => {
    const failure = await operation.catch((reason: unknown) => reason);
    expect(failure).not.toBeInstanceOf(RefusDePublication);
    expect(failure).toMatchObject({ status: 0 });
  };
  const thenItRequestedTheWorkshopElement = (request: TestRequest): void => {
    expect(request.request.url).toBe('/api/atelier/suivis/piece');
  };
  const thenRereadCompletes = async (reread: Promise<void>): Promise<void> => {
    await expect(reread).resolves.toBeUndefined();
  };
});
