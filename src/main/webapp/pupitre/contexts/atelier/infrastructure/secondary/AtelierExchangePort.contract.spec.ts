import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { GesteDePointage, ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
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
  activites: [],
  etat: 'EN_ATTENTE',
  id: 'piece',
  nom: 'PR-2026-000001',
  categorie: 'MOULE',
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
} satisfies RestSuiviDuPupitre;
const referentielFixture = {
  dureeMaximaleDActivite: 'PT13H',
  genereLe: '2026-09-05T08:05:00Z',
  operateurs: [operateurFixture, operateurSansIdentifiantFixture],
  suivis: [suiviSansReferenceFixture, suiviAvecReferenceFixture],
  categories: ['MOULE', 'OF'],
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
  categorie: 'MOULE',
} satisfies RestSuiviDAtelier & RestSuiviDAtelierEnGrille;
const ouvertureFixture: GesteDePointage = {
  nature: 'POINTAGE',
  id: 'geste',
  dateDeSurvenue: '2026-09-05T08:00:00Z',
  operateurId: 'jean',
  suiviId: 'piece',
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

  it.each<[string, number]>([
    ['PT13H', 46_800_000],
    ['PT8H30M', 30_600_000],
    ['PT90M', 5_400_000],
    ['PT1H30M45S', 5_445_000],
  ])('should translate the maximum activity duration %s received with the reference', async (duree, milliseconds) => {
    const reference = whenReadingReference();

    await whenServerReturnsTheReference({ ...referentielFixture, dureeMaximaleDActivite: duree });

    await thenTheMaximumActivityDurationIs(reference, milliseconds);
  });

  it.each(['', 'PT', 'PT0S', 'P1D', '13H', 'PT-1H', 'PT1.5H', 'treize heures'])(
    'should reject the reading of a reference whose maximum activity duration is %j',
    async duree => {
      const reference = whenReadingReference();

      await whenServerReturnsTheReference({ ...referentielFixture, dureeMaximaleDActivite: duree });

      await thenItFailed(reference, "La durée maximale d'une activité n'est pas lisible");
    },
  );

  it('should reject the reading of a reference without a maximum activity duration', async () => {
    const sansDuree = Object.fromEntries(Object.entries(referentielFixture).filter(([champ]) => champ !== 'dureeMaximaleDActivite'));
    const reference = whenReadingReference();

    await whenServerReturnsTheReference(sansDuree);

    await thenItFailed(reference, "La durée maximale d'une activité n'est pas lisible");
  });

  it('should make no referential request without authorization', async () => {
    givenNoAuthorization();

    const reference = whenReadingReference();

    await thenItFailed(reference, 'Aucune autorisation pour lire le référentiel.');
  });

  it.each<GesteDePointage>([
    { ...ouvertureFixture, type: 'DEBUT' },
    { ...ouvertureFixture, type: 'NON_CONFORMITE', posteId: 'tour' },
    { ...ouvertureFixture, type: 'FIN' },
  ])('should preserve captured identity, occurrence and type for $type', async geste => {
    const sent = whenSending(geste);

    const request = await whenServerAcceptsWrite('/api/atelier/suivis/piece/pointages');

    await thenWriteSucceededWith(sent, request, {
      id: 'geste',
      dateDeSurvenue: '2026-09-05T08:00:00Z',
      operateur: 'jean',
      type: geste.type,
      ...(geste.posteId === undefined ? {} : { poste: 'tour' }),
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
    });
    const request = await whenServerAcceptsWrite('/api/atelier/suivis/piece/pointages');

    await thenWriteSucceededWith(fin, request, {
      id: 'geste',
      dateDeSurvenue: ouvertureFixture.dateDeSurvenue,
      operateur: 'jean',
      type: 'FIN',
      poste: 'tour',
    });
  });

  it('should expose every stable business refusal, including codes outside the old allowlist', async () => {
    const refused = whenSending(ouvertureFixture);

    await whenServerRefusesWrite('urn:glm:erreur:atelier:evenement-anterieur-a-l-engagement', 'collision');

    await thenBusinessRefusalIs(refused);
  });

  it.each<[string, ReplayDecision]>([
    ['urn:glm:erreur:atelier:saisie-concurrente', 'RELIRE_ET_REJOUER'],
    ['urn:glm:erreur:atelier:pointage-ignore', 'PROPAGER'],
    ['urn:glm:erreur:atelier:suivi-d-atelier-cloture', 'PROPAGER'],
    ['urn:glm:erreur:autre:saisie-concurrente', 'PROPAGER'],
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
  const whenSending = (geste: GesteDePointage): Promise<Result<void, RefusDePublication>> => observeRejection(serveur.send(geste));
  const whenRereading = (geste: GesteDePointage): Promise<void> => serveur.reread(geste);
  const whenServerReturnsTheReference = async (body: object = referentielFixture): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = http.expectOne('/api/pupitre/referentiel');
    request.flush(body);
    return request;
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
    write: Promise<Result<void, RefusDePublication>>,
    request: ReturnType<HttpTestingController['expectOne']>,
    body: unknown,
  ): Promise<void> => {
    expect(request.request.body).toEqual(body);
    await expect(write).resolves.toEqual({ ok: true, value: undefined });
  };
  const thenReferenceIsComplete = async (operation: Promise<ReferentielDuPupitre>): Promise<void> => {
    const reference = await operation;
    expect(reference.categories).toEqual(['MOULE', 'OF']);
    expect(reference.operateurs).toEqual([
      { id: 'jean', nom: 'Dupont', prenom: 'Jean', identifiant: '049', postes: [] },
      { id: 'marie', nom: 'Martin', prenom: 'Marie', postes: [{ id: 'tour', libelle: 'Tour' }] },
    ]);
    expect(reference.suivis[0]).toEqual({
      id: 'piece',
      nom: 'PR-2026-000001',
      etat: 'EN_ATTENTE',
      categorie: 'MOULE',
      activites: [],
      evenements: [],
    });
    expect(reference.suivis[1]).toEqual({
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
  const thenTheMaximumActivityDurationIs = async (operation: Promise<ReferentielDuPupitre>, milliseconds: number): Promise<void> => {
    expect((await operation).dureeMaximaleDActiviteEnMs).toBe(milliseconds);
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
    expect(result).toMatchObject({ error: { code: 'urn:glm:erreur:atelier:evenement-anterieur-a-l-engagement', message: 'collision' } });
  };
  const thenReplayDecisionIs = async (
    operation: Promise<Result<void, RefusDePublication>>,
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
