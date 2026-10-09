import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { PupitreSynchronization } from '@/pupitre/contexts/atelier/application/PupitreSynchronization';
import { FenetreOperateur } from '@/pupitre/contexts/atelier/domain/designation/fenetre-operateur/FenetreOperateur';
import { Identifiant } from '@/pupitre/contexts/atelier/domain/designation/Identifiant';
import { IdentiteDeFenetre } from '@/pupitre/contexts/atelier/domain/designation/IdentiteDeFenetre';
import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import {
  GesteDePointage,
  JournalDuPupitre,
  ReferentielDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { AtelierExchangePort } from '@/pupitre/contexts/atelier/domain/synchronisation/AtelierExchangePort';
import { HttpAtelierExchange } from '@/pupitre/contexts/atelier/infrastructure/secondary/http/HttpAtelierExchange';
import { IndexedDbJournauxDuPupitre } from '@/pupitre/contexts/atelier/infrastructure/secondary/local/IndexedDbJournauxDuPupitre';
import { DeviceSessionPort } from '@/pupitre/shared/authentication/domain/DeviceSessionPort';
import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { IndexedDbLocalStorage } from '@/pupitre/shared/local-storage/infrastructure/secondary/IndexedDbLocalStorage';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BrowserLocksFixture } from '@test/unit/fixtures/BrowserLocksFixture';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { dureeMaximaleFixtureEnMs } from '@test/unit/fixtures/pupitre/atelier/DureeMaximaleFixture';
import { DeviceSessionFixture } from '@test/unit/fixtures/pupitre/DeviceSessionFixture';
import { SignalFixture } from '@test/unit/fixtures/SignalFixture';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { IDBFactory } from 'fake-indexeddb';

const entrepriseFixture = Entreprise.of('entreprise-a');
const nonConformiteFixture: GesteDePointage = {
  nature: 'POINTAGE',
  id: '4e12c8ad-cf5e-4fb5-b526-372dfc21a001',
  dateDeSurvenue: '2026-09-05T12:00:00Z',
  operateurId: 'jean',
  suiviId: 'piece',
  posteId: 'tour',
  type: 'NON_CONFORMITE',
};
const finALaMemeHeureFixture: GesteDePointage = {
  nature: 'POINTAGE',
  id: '9b0d6a42-7c1e-4f55-a0d3-5a1c2e8f3003',
  dateDeSurvenue: '2026-09-05T12:00:00Z',
  operateurId: 'jean',
  suiviId: 'piece',
  posteId: 'tour',
  type: 'FIN',
};
const finFixture: GesteDePointage = {
  nature: 'POINTAGE',
  id: '1f7e0c56-4059-4b3f-8972-0b4e3f17a002',
  dateDeSurvenue: '2026-09-05T17:00:00Z',
  operateurId: 'jean',
  suiviId: 'piece',
  posteId: 'tour',
  type: 'FIN',
};
const nonConformiteBodyFixture = {
  id: '4e12c8ad-cf5e-4fb5-b526-372dfc21a001',
  dateDeSurvenue: '2026-09-05T12:00:00Z',
  operateur: 'jean',
  poste: 'tour',
  type: 'NON_CONFORMITE',
};
const finALaMemeHeureBodyFixture = {
  id: '9b0d6a42-7c1e-4f55-a0d3-5a1c2e8f3003',
  dateDeSurvenue: '2026-09-05T12:00:00Z',
  operateur: 'jean',
  poste: 'tour',
  type: 'FIN',
};
const finBodyFixture = {
  id: '1f7e0c56-4059-4b3f-8972-0b4e3f17a002',
  dateDeSurvenue: '2026-09-05T17:00:00Z',
  operateur: 'jean',
  poste: 'tour',
  type: 'FIN',
};
const referenceFixture: ReferentielDuPupitre = {
  operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', identifiant: '049', postes: [{ id: 'tour', libelle: 'Tour' }] }],
  suivis: [
    {
      id: 'piece',
      nom: 'OF-1',
      categorie: 'MOULE',
      etat: 'EN_COURS',
      activites: [
        {
          operateurId: 'jean',
          posteId: 'tour',
          categorie: 'NON_CONFORMITE',
          ouverture: 'remplacante-b',
          depuis: '2026-09-05T12:00:00Z',
          echeance: '2026-09-06T01:00:00Z',
        },
      ],
      evenements: [],
    },
  ],
  categories: [],
  dureeMaximaleDActiviteEnMs: dureeMaximaleFixtureEnMs,
};
const publicationFixture = {
  id: 'piece',
  nom: 'OF-1',
  categorie: 'MOULE',
  etat: 'EN_COURS',
  element: 'element',
  engageLe: '2026-09-05T07:00:00Z',
  engagePar: 'gestionnaire',
  activitesEnCours: [],
  journal: [],
} satisfies components['schemas']['RestSuiviDAtelier'];

describe('Durable pupitre HTTP exchange', () => {
  let journal: JournauxDuPupitrePort;
  let synchronization: PupitreSynchronization;
  let http: HttpTestingController;
  let requestArrived: SignalFixture;
  let exchanges: { method: string; url: string; body: unknown }[];
  let tenant: string;

  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.stubGlobal('navigator', { locks: new BrowserLocksFixture() });
    requestArrived = new SignalFixture();
    exchanges = [];
    tenant = 'entreprise-a';
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([
            (request, next) => {
              exchanges.push({ method: request.method, url: request.url, body: request.body });
              requestArrived.release();
              return next(request);
            },
          ]),
        ),
        provideHttpClientTesting(),
        ApiClient,
        PupitreSynchronization,
        { provide: AtelierExchangePort, useClass: HttpAtelierExchange },
        { provide: JournauxDuPupitrePort, useClass: IndexedDbJournauxDuPupitre },
        { provide: LocalStoragePort, useClass: IndexedDbLocalStorage },
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
        { provide: DeviceSessionPort, useClass: DeviceSessionFixture },
        {
          provide: AuthenticationPort,
          useValue: {
            synchronizeSession: () => Promise.resolve(),
            currentTenant: () => tenant,
            currentToken: () => 'authorized',
          },
        },
      ],
    });
    journal = TestBed.inject(JournauxDuPupitrePort);
    synchronization = TestBed.inject(PupitreSynchronization);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
  });

  it.each([
    { order: 'non conformity then finish', gestes: [nonConformiteFixture, finFixture], bodies: [nonConformiteBodyFixture, finBodyFixture] },
    { order: 'finish then non conformity', gestes: [finFixture, nonConformiteFixture], bodies: [finBodyFixture, nonConformiteBodyFixture] },
    {
      order: 'finish then non conformity at the same time',
      gestes: [finALaMemeHeureFixture, nonConformiteFixture],
      bodies: [finALaMemeHeureBodyFixture, nonConformiteBodyFixture],
    },
  ])('should retain FIFO and the original body through one concurrent retry in $order', async ({ gestes, bodies }) => {
    await givenPersistedGestures(gestes);

    await whenRestartingAndReplayingWithConcurrency();
    const restored = await whenRestartingJournal();

    expect(exchanges).toEqual([
      { method: 'POST', url: '/api/atelier/suivis/piece/pointages', body: bodies[0] },
      { method: 'GET', url: '/api/atelier/suivis/piece', body: null },
      { method: 'POST', url: '/api/atelier/suivis/piece/pointages', body: bodies[0] },
      { method: 'POST', url: '/api/atelier/suivis/piece/pointages', body: bodies[1] },
      { method: 'GET', url: '/api/pupitre/referentiel', body: null },
    ]);
    expect(restored.evenements).toEqual(gestes.map(geste => ({ geste, etat: 'ACCEPTE' })));
    expect(restored.referentiel).toEqual(referenceFixture);
    expect(restored.connecte).toBe(true);
  });

  it.each([
    {
      order: 'non conformity then finish',
      gestes: [nonConformiteFixture, finFixture],
      bodies: [nonConformiteBodyFixture, finBodyFixture],
      code: 'poste-de-travail-introuvable',
    },
    {
      order: 'finish then non conformity',
      gestes: [finFixture, nonConformiteFixture],
      bodies: [finBodyFixture, nonConformiteBodyFixture],
      code: 'saisie-concurrente',
    },
  ])('should retain the final $code refusal and continue FIFO in $order without another retry', async ({ gestes, bodies, code }) => {
    await givenPersistedGestures(gestes);

    await whenRestartingAndReplayingWithConcurrency(code);
    const restored = await whenRestartingJournal();

    expect(exchanges).toEqual([
      { method: 'POST', url: '/api/atelier/suivis/piece/pointages', body: bodies[0] },
      { method: 'GET', url: '/api/atelier/suivis/piece', body: null },
      { method: 'POST', url: '/api/atelier/suivis/piece/pointages', body: bodies[0] },
      { method: 'POST', url: '/api/atelier/suivis/piece/pointages', body: bodies[1] },
      { method: 'GET', url: '/api/pupitre/referentiel', body: null },
    ]);
    expect(restored.evenements).toEqual([
      { geste: gestes[0], etat: 'REFUSE', refus: { code: `urn:glm:erreur:atelier:${code}`, message: 'Final refusal', motif: code } },
      { geste: gestes[1], etat: 'ACCEPTE' },
    ]);
    expect(restored.referentiel).toEqual(referenceFixture);
    expect(restored.connecte).toBe(true);
  });

  it('should isolate two persisted company bodies, pending work, references and resumption through alternation and restart', async () => {
    const beforeA = await givenACompanyWithPauseAndPendingFinish('entreprise-a', '2026-09-05T17:00:00Z');
    const beforeB = await givenACompanyWithPauseAndPendingFinish('entreprise-b', '2026-09-05T18:00:00Z');

    await journal.append(entrepriseFixture, [], 'jean');
    await whenPublishingCompany('entreprise-b');
    const pendingAWhileBWasSelected = await whenRestartingJournal();
    const acceptedB = await journal.read(Entreprise.of('entreprise-b'));
    await whenPublishingCompany('entreprise-a');
    const acceptedA = await whenRestartingJournal();
    const restoredB = await journal.read(Entreprise.of('entreprise-b'));
    const windowA = windowOf(entrepriseFixture, acceptedA);
    const windowB = windowOf(Entreprise.of('entreprise-b'), restoredB);

    expect(pendingAWhileBWasSelected).toEqual({ ...beforeA, pausesArretees: ['pause-entreprise-a'] });
    expect(acceptedB).toEqual(afterAcceptingLastCompanyGesture(beforeB));
    expect(acceptedA).toEqual({ ...afterAcceptingLastCompanyGesture(beforeA), pausesArretees: ['pause-entreprise-a'] });
    expect(restoredB).toEqual(acceptedB);
    expect(exchanges).toEqual([
      {
        method: 'POST',
        url: '/api/atelier/suivis/piece/pointages',
        body: {
          id: '90807c80-0588-4d6a-a002-fc355de16530',
          dateDeSurvenue: '2026-09-05T18:00:00Z',
          operateur: 'marie',
          poste: 'tour',
          type: 'FIN',
        },
      },
      { method: 'GET', url: '/api/pupitre/referentiel', body: null },
      {
        method: 'POST',
        url: '/api/atelier/suivis/piece/pointages',
        body: {
          id: '90807c80-0588-4d6a-a002-fc355de16530',
          dateDeSurvenue: '2026-09-05T17:00:00Z',
          operateur: 'marie',
          poste: 'tour',
          type: 'FIN',
        },
      },
      { method: 'GET', url: '/api/pupitre/referentiel', body: null },
    ]);
    expect(windowA.commandesGlobales().permet('REPRENDRE')).toBe(false);
    expect(windowB.commandesGlobales().permet('REPRENDRE')).toBe(true);
  });

  const givenPersistedGestures = async (gestes: readonly GesteDePointage[]): Promise<void> => {
    await journal.saveReferentiel(entrepriseFixture, referenceFixture);
    await journal.append(entrepriseFixture, gestes);
  };
  const givenACompanyWithPauseAndPendingFinish = async (company: string, occurrence: string): Promise<JournalDuPupitre> => {
    const entreprise = Entreprise.of(company);
    const suspension: GesteDePointage = {
      ...finFixture,
      id: `suspension-${company}`,
      dateDeSurvenue: '2026-09-05T12:00:00Z',
      suspension: { pause: `pause-${company}`, reouverture: 'NON_CONFORMITE' },
    };
    const pending: GesteDePointage = {
      ...finFixture,
      id: '90807c80-0588-4d6a-a002-fc355de16530',
      dateDeSurvenue: occurrence,
      operateurId: 'marie',
    };
    await journal.saveReferentiel(entreprise, companyReferenceFixture(company));
    await journal.append(entreprise, [suspension, pending]);
    await journal.saveResult(entreprise, { geste: suspension, etat: 'ACCEPTE' });
    return journal.read(entreprise);
  };
  const companyReferenceFixture = (company: string): ReferentielDuPupitre => ({
    operateurs: [
      { id: 'jean', nom: company, prenom: 'Jean', identifiant: '049', postes: [{ id: 'tour', libelle: 'Tour' }] },
      { id: 'marie', nom: company, prenom: 'Marie', postes: [{ id: 'tour', libelle: 'Tour' }] },
    ],
    suivis: [
      {
        id: 'piece',
        nom: `OF-${company}`,
        categorie: 'MOULE',
        etat: 'EN_COURS',
        activites: [
          {
            operateurId: 'marie',
            posteId: 'tour',
            ouverture: `activite-${company}`,
            categorie: 'TRAVAIL',
            depuis: '2026-09-05T08:00:00Z',
            echeance: '2026-09-05T21:00:00Z',
          },
        ],
        evenements: [],
      },
    ],
    categories: [],
    dureeMaximaleDActiviteEnMs: dureeMaximaleFixtureEnMs,
  });
  const afterAcceptingLastCompanyGesture = (before: JournalDuPupitre): JournalDuPupitre => ({
    ...before,
    evenements: [
      ...before.evenements.slice(0, -1),
      { geste: requiredFixture(before.evenements.at(-1), 'pending company gesture').geste, etat: 'ACCEPTE' },
    ],
  });
  const whenRestartingJournal = (): Promise<JournalDuPupitre> => {
    journal = TestBed.runInInjectionContext(() => new IndexedDbJournauxDuPupitre());
    return journal.read(entrepriseFixture);
  };
  const whenNextRequestArrives = async (): Promise<TestRequest> => {
    await requestArrived.promise;
    requestArrived = new SignalFixture();
    return http.expectOne(() => true);
  };
  const whenRestartingAndReplayingWithConcurrency = async (refusalCode?: string): Promise<void> => {
    await whenRestartingJournal();
    synchronization = TestBed.runInInjectionContext(() => new PupitreSynchronization());
    const replay = synchronization.synchronize(() => undefined);
    const first = await whenNextRequestArrives();
    first.flush(
      { type: 'urn:glm:erreur:atelier:saisie-concurrente', message: 'Concurrent update' },
      { status: 409, statusText: 'Conflict' },
    );
    const reread = await whenNextRequestArrives();
    reread.flush(publicationFixture);
    const retry = await whenNextRequestArrives();
    whenCompletingTheRetry(retry, refusalCode);
    const following = await whenNextRequestArrives();
    following.flush(publicationFixture, { status: 201, statusText: 'Created' });
    await whenReferenceRefreshFails();
    await replay;
  };
  const whenCompletingTheRetry = (retry: TestRequest, refusalCode?: string): void => {
    if (refusalCode !== undefined) {
      retry.flush({ type: `urn:glm:erreur:atelier:${refusalCode}`, message: 'Final refusal' }, { status: 409, statusText: 'Conflict' });
      return;
    }
    retry.flush(publicationFixture, { status: 200, statusText: 'OK' });
  };
  const whenReferenceRefreshFails = async (): Promise<void> => {
    const reference = await whenNextRequestArrives();
    reference.flush('Reference unavailable', { status: 503, statusText: 'Service unavailable' });
  };
  const whenPublishingCompany = async (company: string): Promise<void> => {
    tenant = company;
    const replay = synchronization.synchronize(() => undefined);
    const publication = await whenNextRequestArrives();
    publication.flush(publicationFixture, { status: 200, statusText: 'OK' });
    await whenReferenceRefreshFails();
    await replay;
  };
  const windowOf = (entreprise: Entreprise, state: JournalDuPupitre): FenetreOperateur =>
    FenetreOperateur.open(
      entreprise,
      state,
      Identifiant.empty().afterDigit('0').afterDigit('4').afterDigit('9'),
      Date.parse('2026-09-05T18:00:00Z'),
      new IdentiteDeFenetre(1),
    );
});
