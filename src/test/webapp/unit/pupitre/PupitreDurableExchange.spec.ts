import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { PupitreSynchronization } from '@/pupitre/contexts/atelier/application/PupitreSynchronization';
import { FenetreOperateur } from '@/pupitre/contexts/atelier/domain/designation/fenetre-operateur/FenetreOperateur';
import { IdentiteDeFenetre } from '@/pupitre/contexts/atelier/domain/designation/IdentiteDeFenetre';
import { Matricule } from '@/pupitre/contexts/atelier/domain/designation/Matricule';
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
import { DeviceSessionFixture } from '@test/unit/fixtures/pupitre/DeviceSessionFixture';
import { SignalFixture } from '@test/unit/fixtures/SignalFixture';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { IDBFactory } from 'fake-indexeddb';

const entrepriseFixture = Entreprise.of('entreprise-a');
const transitionFixture: GesteDePointage = {
  nature: 'POINTAGE',
  id: '4e12c8ad-cf5e-4fb5-b526-372dfc21a001',
  dateDeSurvenue: '2026-09-05T12:00:00Z',
  operateurId: 'jean',
  suiviId: 'piece',
  posteId: 'tour',
  intention: 'TRANSITION',
  type: 'NON_CONFORMITE',
  cible: 'ouverture-a',
};
const finFixture: GesteDePointage = {
  nature: 'POINTAGE',
  id: '1f7e0c56-4059-4b3f-8972-0b4e3f17a002',
  dateDeSurvenue: '2026-09-05T17:00:00Z',
  operateurId: 'jean',
  suiviId: 'piece',
  posteId: 'tour',
  intention: 'FIN',
  type: 'FIN',
  cible: 'ouverture-a',
};
const transitionBodyFixture = {
  id: '4e12c8ad-cf5e-4fb5-b526-372dfc21a001',
  dateDeSurvenue: '2026-09-05T12:00:00Z',
  operateur: 'jean',
  poste: 'tour',
  intention: 'TRANSITION',
  type: 'NON_CONFORMITE',
  cible: 'ouverture-a',
};
const finBodyFixture = {
  id: '1f7e0c56-4059-4b3f-8972-0b4e3f17a002',
  dateDeSurvenue: '2026-09-05T17:00:00Z',
  operateur: 'jean',
  poste: 'tour',
  intention: 'FIN',
  type: 'FIN',
  cible: 'ouverture-a',
};
const referenceFixture: ReferentielDuPupitre = {
  operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [{ id: 'tour', libelle: 'Tour' }] }],
  suivis: [
    {
      id: 'piece',
      nom: 'OF-1',
      type: 'PRODUIT',
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
      conflits: [],
      evenements: [],
    },
  ],
};
const publicationFixture = {
  id: 'piece',
  nom: 'OF-1',
  type: 'PRODUIT',
  etat: 'EN_COURS',
  element: 'element',
  engageLe: '2026-09-05T07:00:00Z',
  engagePar: 'gestionnaire',
  activitesEnCours: [],
  journal: [],
  conflits: [{ activites: ['ouverture-a', 'remplacante-b'], pointages: [transitionFixture.id, finFixture.id] }],
} satisfies components['schemas']['RestSuiviDAtelier'];
const conflitFixture = { activites: ['ouverture-a', 'remplacante-b'], pointages: [transitionFixture.id, finFixture.id] };
const independentConflictFixture = { operateurId: 'jean', activites: [], pointages: ['contradiction-independante'] };
const independentReferenceFixture: ReferentielDuPupitre = {
  ...referenceFixture,
  suivis: [
    ...referenceFixture.suivis,
    {
      id: 'piece-independante',
      nom: 'OF-2',
      type: 'PRODUIT',
      etat: 'EN_COURS',
      activites: [
        {
          operateurId: 'jean',
          ouverture: 'ouverture-independante',
          categorie: 'TRAVAIL',
          depuis: '2026-09-05T16:00:00Z',
          echeance: '2026-09-06T05:00:00Z',
        },
      ],
      conflits: [],
      evenements: [],
    },
    {
      id: 'conflit-independant',
      nom: 'OF-3',
      type: 'PRODUIT',
      etat: 'EN_ATTENTE',
      activites: [],
      conflits: [independentConflictFixture],
      evenements: [],
    },
  ],
};
const resolvedReferenceFixture = {
  genereLe: '2026-09-05T18:00:00Z',
  operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [{ id: 'tour', libelle: 'Tour' }] }],
  suivis: [
    {
      id: 'piece',
      nom: 'OF-1',
      type: 'PRODUIT',
      etat: 'EN_COURS',
      activites: [
        {
          operateur: 'jean',
          poste: 'tour',
          ouverture: 'ouverture-canonique',
          categorie: 'TRAVAIL',
          depuis: '2026-09-05T17:30:00Z',
          echeance: '2026-09-06T06:30:00Z',
        },
      ],
      conflits: [],
    },
    {
      id: 'piece-independante',
      nom: 'OF-2',
      type: 'PRODUIT',
      etat: 'EN_COURS',
      activites: [
        {
          operateur: 'jean',
          ouverture: 'ouverture-independante',
          categorie: 'TRAVAIL',
          depuis: '2026-09-05T16:00:00Z',
          echeance: '2026-09-06T05:00:00Z',
        },
      ],
      conflits: [],
    },
    {
      id: 'conflit-independant',
      nom: 'OF-3',
      type: 'PRODUIT',
      etat: 'EN_ATTENTE',
      activites: [],
      conflits: [{ operateur: 'jean', activites: [], pointages: ['contradiction-independante'] }],
    },
  ],
} satisfies components['schemas']['RestReferentielDuPupitre'];

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
    { order: 'transition then finish', gestes: [transitionFixture, finFixture], bodies: [transitionBodyFixture, finBodyFixture] },
    { order: 'finish then transition', gestes: [finFixture, transitionFixture], bodies: [finBodyFixture, transitionBodyFixture] },
  ])('should retain FIFO and the targeted body through one concurrent retry in $order', async ({ gestes, bodies }) => {
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
    expect(restored.evenements).toEqual(gestes.map(geste => ({ geste, etat: 'ACCEPTE', conflits: [conflitFixture] })));
    expect(restored.referentiel).toEqual(referenceFixture);
    expect(restored.connecte).toBe(true);
  });

  it.each([
    {
      order: 'transition then finish',
      gestes: [transitionFixture, finFixture],
      bodies: [transitionBodyFixture, finBodyFixture],
      code: 'activite-visee-incoherente',
    },
    {
      order: 'finish then transition',
      gestes: [finFixture, transitionFixture],
      bodies: [finBodyFixture, transitionBodyFixture],
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
      { geste: gestes[0], etat: 'REFUSE', refus: { code: `urn:glm:erreur:atelier:${code}`, message: 'Final refusal' } },
      { geste: gestes[1], etat: 'ACCEPTE', conflits: [conflitFixture] },
    ]);
    expect(restored.referentiel).toEqual(referenceFixture);
    expect(restored.connecte).toBe(true);
  });

  it('should restore an accepted conflict after a failed refresh and reconcile only the resolved sequence without replaying it', async () => {
    await journal.saveReferentiel(entrepriseFixture, independentReferenceFixture);
    await journal.append(entrepriseFixture, [finFixture]);

    await whenAcceptingTheGestureBeforeRefreshFails();
    const beforeResolution = await whenRestartingJournal();
    const conflictedWindow = windowOf(entrepriseFixture, beforeResolution);
    const independentFinish = finishesOf(conflictedWindow, 'piece-independante');
    const beforeResolutionView = conflictedWindow.pointage();
    await whenResolvingTheReferenceAfterRestart();
    const afterResolution = await whenRestartingJournal();
    const resolvedWindow = windowOf(entrepriseFixture, afterResolution);
    const canonicalFinish = finishesOf(resolvedWindow, 'piece');
    const afterResolutionView = resolvedWindow.pointage();

    expect(beforeResolution.evenements).toEqual([{ geste: finFixture, etat: 'ACCEPTE', conflits: [conflitFixture] }]);
    expect(beforeResolution.referentiel).toEqual(independentReferenceFixture);
    expect(beforeResolutionView.conflits.map(conflit => conflit.id)).toEqual(['piece', 'conflit-independant']);
    expect(independentFinish).toEqual([
      {
        nature: 'POINTAGE',
        id: 'fin-canonique',
        dateDeSurvenue: '2026-09-05T18:00:00Z',
        operateurId: 'jean',
        suiviId: 'piece-independante',
        intention: 'FIN',
        type: 'FIN',
        cible: 'ouverture-independante',
      },
    ]);
    expect(exchanges).toEqual([
      { method: 'POST', url: '/api/atelier/suivis/piece/pointages', body: finBodyFixture },
      { method: 'GET', url: '/api/pupitre/referentiel', body: null },
      { method: 'GET', url: '/api/pupitre/referentiel', body: null },
    ]);
    expect(afterResolution.evenements).toEqual(beforeResolution.evenements);
    expect(afterResolution.referentiel?.suivis[0]?.evenements).toEqual([finFixture.id]);
    expect(afterResolutionView.conflits.map(conflit => conflit.id)).toEqual(['conflit-independant']);
    expect(afterResolutionView.moules.filter(element => element.isActive()).map(element => element.id)).toEqual([
      'piece',
      'piece-independante',
    ]);
    expect(canonicalFinish).toEqual([
      {
        nature: 'POINTAGE',
        id: 'fin-canonique',
        dateDeSurvenue: '2026-09-05T18:00:00Z',
        operateurId: 'jean',
        suiviId: 'piece',
        posteId: 'tour',
        intention: 'FIN',
        type: 'FIN',
        cible: 'ouverture-canonique',
      },
    ]);
  });

  it('should isolate two persisted company bodies, pending work, references, conflicts and resumption through alternation and restart', async () => {
    const beforeA = await givenACompanyWithPauseConflictAndPendingFinish('entreprise-a', '2026-09-05T17:00:00Z');
    const beforeB = await givenACompanyWithPauseConflictAndPendingFinish('entreprise-b', '2026-09-05T18:00:00Z');

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
          intention: 'FIN',
          type: 'FIN',
          cible: 'activite-entreprise-b',
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
          intention: 'FIN',
          type: 'FIN',
          cible: 'activite-entreprise-a',
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
  const givenACompanyWithPauseConflictAndPendingFinish = async (company: string, occurrence: string): Promise<JournalDuPupitre> => {
    const entreprise = Entreprise.of(company);
    const suspension: GesteDePointage = {
      ...finFixture,
      id: `suspension-${company}`,
      dateDeSurvenue: '2026-09-05T12:00:00Z',
      cible: `activite-suspendue-${company}`,
      suspension: { pause: `pause-${company}`, reouverture: 'NON_CONFORMITE' },
    };
    const conflictOpening: GesteDePointage = {
      nature: 'POINTAGE',
      id: `conflit-${company}`,
      dateDeSurvenue: '2026-09-05T13:00:00Z',
      operateurId: 'marie',
      suiviId: 'autre-piece',
      intention: 'OUVERTURE',
      type: 'DEBUT',
    };
    const pending: GesteDePointage = {
      ...finFixture,
      id: '90807c80-0588-4d6a-a002-fc355de16530',
      dateDeSurvenue: occurrence,
      operateurId: 'marie',
      cible: `activite-${company}`,
    };
    await journal.saveReferentiel(entreprise, companyReferenceFixture(company));
    await journal.append(entreprise, [suspension, conflictOpening, pending]);
    await journal.saveResult(entreprise, { geste: suspension, etat: 'ACCEPTE' });
    await journal.saveResult(entreprise, {
      geste: conflictOpening,
      etat: 'ACCEPTE',
      conflits: [{ operateurId: 'marie', activites: [], pointages: [conflictOpening.id] }],
    });
    return journal.read(entreprise);
  };
  const companyReferenceFixture = (company: string): ReferentielDuPupitre => ({
    operateurs: [
      { id: 'jean', nom: company, prenom: 'Jean', matricule: '049', postes: [{ id: 'tour', libelle: 'Tour' }] },
      { id: 'marie', nom: company, prenom: 'Marie', postes: [{ id: 'tour', libelle: 'Tour' }] },
    ],
    suivis: [
      {
        id: 'piece',
        nom: `OF-${company}`,
        type: 'PRODUIT',
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
        conflits: [],
        evenements: [],
      },
      { id: 'autre-piece', nom: `Conflit-${company}`, type: 'PRODUIT', etat: 'EN_ATTENTE', activites: [], conflits: [], evenements: [] },
    ],
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
  const whenAcceptingTheGestureBeforeRefreshFails = async (): Promise<void> => {
    const replay = synchronization.synchronize(() => undefined);
    const publication = await whenNextRequestArrives();
    publication.flush(publicationFixture, { status: 201, statusText: 'Created' });
    await whenReferenceRefreshFails();
    await replay;
  };
  const whenPublishingCompany = async (company: string): Promise<void> => {
    tenant = company;
    const replay = synchronization.synchronize(() => undefined);
    const publication = await whenNextRequestArrives();
    publication.flush({ ...publicationFixture, conflits: [] }, { status: 200, statusText: 'OK' });
    await whenReferenceRefreshFails();
    await replay;
  };
  const whenResolvingTheReferenceAfterRestart = async (): Promise<void> => {
    synchronization = TestBed.runInInjectionContext(() => new PupitreSynchronization());
    const exchange = synchronization.synchronize(() => undefined);
    const reference = await whenNextRequestArrives();
    reference.flush(resolvedReferenceFixture);
    await exchange;
  };
  const windowOf = (entreprise: Entreprise, state: JournalDuPupitre): FenetreOperateur =>
    FenetreOperateur.open(
      entreprise,
      state,
      Matricule.empty().afterDigit('0').afterDigit('4').afterDigit('9'),
      Date.parse('2026-09-05T18:00:00Z'),
      new IdentiteDeFenetre(1),
    );
  const finishesOf = (window: FenetreOperateur, suiviId: string): readonly GesteDePointage[] => {
    const decision = window.afterDeciding(
      suiviId,
      'PRINCIPALE',
      () => ({ id: 'fin-canonique', dateDeSurvenue: '2026-09-05T18:00:00Z' }),
      Date.parse('2026-09-05T18:00:00Z'),
    ).decision;
    if (decision.kind !== 'GESTES') throw new Error('Missing targeted finish fixture.');
    return decision.capture();
  };
});
