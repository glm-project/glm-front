import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import {
  EMPTY_JOURNAL_DU_PUPITRE,
  EvenementDuJournal,
  GesteDePointage,
  JournalDuPupitre,
  ReferentielDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { IndexedDbLocalStorage } from '@/pupitre/shared/local-storage/infrastructure/secondary/IndexedDbLocalStorage';
import { TestBed } from '@angular/core/testing';
import { BrowserLocksFixture } from '@test/unit/fixtures/BrowserLocksFixture';
import { JournauxDuPupitreFixture } from '@test/unit/fixtures/pupitre/atelier/JournauxDuPupitreFixture';
import { SignalFixture } from '@test/unit/fixtures/SignalFixture';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { IDBFactory, IDBObjectStore, IDBRequest } from 'fake-indexeddb';
import { FenetreOperateur } from '../../domain/designation/fenetre-operateur/FenetreOperateur';
import { Identifiant } from '../../domain/designation/Identifiant';
import { IdentiteDeFenetre } from '../../domain/designation/IdentiteDeFenetre';
import { IntentionGlobaleInitiee } from '../../domain/designation/IntentionGlobaleInitiee';
import { IndexedDbJournauxDuPupitre } from './local/IndexedDbJournauxDuPupitre';

const referenceFixture: ReferentielDuPupitre = { operateurs: [], suivis: [] };
const refreshedReferenceFixture: ReferentielDuPupitre = {
  operateurs: [],
  suivis: [
    { conflits: [], id: 'piece', nom: 'OF-1', etat: 'EN_ATTENTE', type: 'PRODUIT', activites: [], evenements: [] },
    { conflits: [], id: 'autre-piece', nom: 'OF-2', etat: 'EN_ATTENTE', type: 'PRODUIT', activites: [], evenements: [] },
  ],
};
const ouvertureFixture: GesteDePointage = {
  nature: 'POINTAGE',
  id: 'arrivee',
  dateDeSurvenue: '2026-09-05T08:00:00Z',
  operateurId: 'jean',
  suiviId: 'piece',
  intention: 'OUVERTURE',
  type: 'DEBUT',
};
const finFixture: GesteDePointage = {
  ...ouvertureFixture,
  id: 'depart',
  nature: 'POINTAGE',
  type: 'FIN',
  suiviId: 'piece',
  intention: 'FIN',
  cible: 'ouverture-fixture',
};
const pointageFixture: GesteDePointage = {
  ...ouvertureFixture,
  id: 'pointage',
  nature: 'POINTAGE',
  type: 'DEBUT',
  suiviId: 'piece',
  intention: 'OUVERTURE',
};
const pointageEnAttenteFixture: GesteDePointage = {
  ...ouvertureFixture,
  id: 'pointage-attente',
  nature: 'POINTAGE',
  type: 'DEBUT',
  suiviId: 'piece',
  intention: 'OUVERTURE',
};
const pointageAutreSuiviFixture: GesteDePointage = {
  ...ouvertureFixture,
  id: 'pointage-autre',
  nature: 'POINTAGE',
  type: 'DEBUT',
  suiviId: 'autre-piece',
  intention: 'OUVERTURE',
};

const suspensionFixture: GesteDePointage = {
  ...ouvertureFixture,
  id: 'fin-pause',
  nature: 'POINTAGE',
  type: 'FIN',
  suiviId: 'piece',
  posteId: 'tour',
  suspension: { pause: 'pause-de-midi', reouverture: 'NON_CONFORMITE' },
  intention: 'FIN',
  cible: 'activite-fixture-47',
};

const refusFixture = { code: 'CONFLIT', message: 'refusé' };

const adapters = [
  ['local storage', () => TestBed.inject(IndexedDbJournauxDuPupitre)],
  ['application fixture', () => new JournauxDuPupitreFixture()],
] as const;

interface SynchronizationFixture {
  entered: SignalFixture;
  release: SignalFixture;
  chronology: string[];
}

const givenSynchronizationSignals = (): SynchronizationFixture => ({
  entered: new SignalFixture(),
  release: new SignalFixture(),
  chronology: [],
});
const whenTheFirstOperationHasEntered = (entered: SignalFixture): Promise<void> => entered.promise;
const whenReleasingOperation = async (release: SignalFixture, operation: Promise<void>): Promise<void> => {
  release.release();
  await operation;
};
const thenChronologyIs = (chronology: string[], expected: string[]): void => {
  expect(chronology).toEqual(expected);
};

describe.each(adapters)('JournauxDuPupitrePort contract, honoured by %s', (_name, build) => {
  let journal: JournauxDuPupitrePort;

  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.stubGlobal('navigator', { locks: new BrowserLocksFixture() });
    TestBed.configureTestingModule({
      providers: [IndexedDbJournauxDuPupitre, { provide: LocalStoragePort, useClass: IndexedDbLocalStorage }],
    });
    journal = build();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should restore an empty company before its first reference or gesture', async () => {
    const state = await whenReadingCompany('entreprise-a');

    thenStateIs(state, EMPTY_JOURNAL_DU_PUPITRE);
  });

  it('should retain the complete opening in order and keep another company independent', async () => {
    await givenACompanyReference();

    await whenAppendingTheCompleteOpening();

    await thenCompanyStateIs('entreprise-a', completeOpeningFixture());
    await thenCompanyStateIs('entreprise-b', EMPTY_JOURNAL_DU_PUPITRE);
  });

  it('should keep the pause a finish belongs to across acceptance and a later read', async () => {
    await givenACompanyReference();

    await whenAppendingAndAcceptingASuspension();

    await thenCompanyStateIs('entreprise-a', {
      referentiel: referenceFixture,
      connecte: true,
      evenements: [{ geste: suspensionFixture, etat: 'ACCEPTE' }],
    });
  });

  it('should preserve a concurrent append and a refusal while recording a push outcome', async () => {
    const refus = await givenADisconnectedQueue();

    await whenSavingARefusalWhileAppending(refus);

    await thenCompanyStateIs('entreprise-a', {
      connecte: true,
      evenements: [refus, { geste: finFixture, etat: 'EN_ATTENTE' }, { geste: pointageFixture, etat: 'EN_ATTENTE' }],
    });
  });

  it('should forget accepted gestures already in a fresh reference while keeping pending and refused ones', async () => {
    await givenAcceptedPendingAndRefusedGestures();

    const state = await whenSavingAFreshReference();

    thenStateIs(state, {
      referentiel: {
        ...refreshedReferenceFixture,
        suivis: [
          { ...requiredFixture(refreshedReferenceFixture.suivis[0], 'refreshed workshop element'), evenements: ['depart'] },
          requiredFixture(refreshedReferenceFixture.suivis[1], 'other refreshed workshop element'),
        ],
      },
      connecte: true,
      evenements: [
        { geste: pointageEnAttenteFixture, etat: 'EN_ATTENTE' },
        { geste: pointageAutreSuiviFixture, etat: 'REFUSE', refus: refusFixture },
        { geste: finFixture, etat: 'ACCEPTE' },
      ],
    });
  });

  it('should record disconnected state when synchronization marks the company offline', async () => {
    await givenACompanyReference();

    const state = await whenMarkingCompanyDisconnected('entreprise-a');

    thenStateIs(state, {
      referentiel: referenceFixture,
      connecte: false,
      evenements: [],
    });
  });

  it('should serialize synchronize operations while allowing local capture', async () => {
    const { entered, release, chronology } = givenSynchronizationSignals();

    const first = whenHoldingTheFirstOperation(entered, release, chronology);
    await whenTheFirstOperationHasEntered(entered);

    const second = whenStartingTheSecondOperation(chronology);
    await whenAppendingOpening();

    const beforeRelease = await whenCompletingConcurrentOperations(chronology, release, first, second);

    thenChronologyIs(beforeRelease, ['first']);

    thenChronologyIs(chronology, ['first', 'second']);
  });

  const givenACompanyReference = async (): Promise<void> => {
    await journal.saveReferentiel(Entreprise.of('entreprise-a'), referenceFixture);
  };
  const completeOpeningFixture = (): JournalDuPupitre => ({
    referentiel: referenceFixture,
    connecte: true,
    evenements: [ouvertureFixture, pointageFixture].map(geste => ({ geste, etat: 'EN_ATTENTE' })),
  });
  const givenADisconnectedQueue = async (): Promise<EvenementDuJournal> => {
    await journal.append(Entreprise.of('entreprise-a'), [ouvertureFixture, finFixture]);
    await journal.markDisconnected(Entreprise.of('entreprise-a'));
    return { geste: ouvertureFixture, etat: 'REFUSE', refus: { code: 'cause', message: 'cause conservee' } };
  };
  const givenAcceptedPendingAndRefusedGestures = async (): Promise<void> => {
    await journal.append(Entreprise.of('entreprise-a'), [pointageFixture, pointageEnAttenteFixture, pointageAutreSuiviFixture, finFixture]);
    await journal.saveResult(Entreprise.of('entreprise-a'), { geste: pointageFixture, etat: 'ACCEPTE' });
    await journal.saveResult(Entreprise.of('entreprise-a'), { geste: pointageAutreSuiviFixture, etat: 'REFUSE', refus: refusFixture });
    await journal.saveResult(Entreprise.of('entreprise-a'), { geste: finFixture, etat: 'ACCEPTE' });
  };

  const whenCompletingConcurrentOperations = async (
    chronology: string[],
    release: SignalFixture,
    first: Promise<void>,
    second: Promise<void>,
  ): Promise<string[]> => {
    const beforeRelease = [...chronology];
    await whenReleasingTheOperations(release, first, second);
    return beforeRelease;
  };
  const whenReadingCompany = (company: string): Promise<JournalDuPupitre> => journal.read(Entreprise.of(company));
  const whenAppendingAndAcceptingASuspension = async (): Promise<void> => {
    await journal.append(Entreprise.of('entreprise-a'), [suspensionFixture]);
    await journal.saveResult(Entreprise.of('entreprise-a'), { geste: suspensionFixture, etat: 'ACCEPTE' });
  };
  const whenAppendingTheCompleteOpening = (): Promise<void> =>
    journal.append(Entreprise.of('entreprise-a'), [ouvertureFixture, pointageFixture]);
  const whenAppendingOpening = (): Promise<void> => journal.append(Entreprise.of('entreprise-a'), [ouvertureFixture]);
  const whenSavingAFreshReference = (): Promise<JournalDuPupitre> =>
    journal.saveReferentiel(Entreprise.of('entreprise-a'), refreshedReferenceFixture);
  const whenMarkingCompanyDisconnected = (company: string): Promise<JournalDuPupitre> => journal.markDisconnected(Entreprise.of(company));
  const whenSavingARefusalWhileAppending = async (refusal: EvenementDuJournal): Promise<void> => {
    await Promise.all([
      journal.saveResult(Entreprise.of('entreprise-a'), refusal),
      journal.append(Entreprise.of('entreprise-a'), [pointageFixture]),
    ]);
  };
  const whenHoldingTheFirstOperation = (entered: SignalFixture, release: SignalFixture, chronology: string[]): Promise<void> =>
    journal.synchronize(async () => {
      chronology.push('first');
      entered.release();
      await release.promise;
    });
  const whenStartingTheSecondOperation = (chronology: string[]): Promise<void> =>
    journal.synchronize(async () => {
      await new Promise(resolve => setTimeout(resolve));
      chronology.push('second');
    });
  const whenReleasingTheOperations = async (release: SignalFixture, ...operations: Promise<void>[]): Promise<void> => {
    release.release();
    await Promise.all(operations);
  };

  const thenStateIs = (state: JournalDuPupitre, expected: JournalDuPupitre): void => {
    expect(state).toEqual(expected);
  };
  const thenCompanyStateIs = async (company: string, expected: JournalDuPupitre): Promise<void> => {
    thenStateIs(await journal.read(Entreprise.of(company)), expected);
  };
});

describe('IndexedDbJournauxDuPupitre fresh activity journal', () => {
  let journal: IndexedDbJournauxDuPupitre;
  let storage: LocalStoragePort;

  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.stubGlobal('navigator', { locks: new BrowserLocksFixture() });
    TestBed.configureTestingModule({
      providers: [IndexedDbJournauxDuPupitre, { provide: LocalStoragePort, useClass: IndexedDbLocalStorage }],
    });
    journal = TestBed.inject(IndexedDbJournauxDuPupitre);
    storage = TestBed.inject(LocalStoragePort);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should ignore the old workshop journal without translating any gesture', async () => {
    await givenALegacyAcceptedArrival();

    const state = await whenReadingCompany('entreprise-a');

    expect(state).toEqual(EMPTY_JOURNAL_DU_PUPITRE);
  });

  it('should discard only the obsolete workshop documents and preserve credentials and new company journals', async () => {
    await givenALegacyAcceptedArrival();
    await givenOtherCompanyAndDeviceDocuments();

    await whenReadingCompany('entreprise-a');

    await thenOnlyObsoleteWorkshopDocumentsAreGone();
  });

  it.each([
    { count: 0, activites: [] },
    {
      count: 2,
      activites: [
        {
          ouverture: 'a',
          operateurId: 'jean',
          categorie: 'TRAVAIL' as const,
          depuis: '2026-09-05T08:00:00Z',
          echeance: '2026-09-05T21:00:00Z',
        },
        {
          ouverture: 'b',
          posteId: 'fraiseuse',
          operateurId: 'jean',
          categorie: 'NON_CONFORMITE' as const,
          depuis: '2026-09-05T08:30:00Z',
          echeance: '2026-09-05T21:30:00Z',
        },
      ],
    },
  ])(
    'should atomically retain $count targeted finishes and clear resumption across a journal adapter restart',
    async ({ count, activites }) => {
      const before = await givenAStoredPause(activites);
      const window = windowOf(before);
      const stop = window.prepareAcceptance(
        new IntentionGlobaleInitiee('TOUT_ARRETER', {
          id: 'arret',
          dateDeSurvenue: '2026-09-05T12:00:00Z',
        }).prepare(window),
      );

      await whenAppendingStop(stop);

      const after = await whenRestartingJournal();
      const restoredWindow = windowOf(after);
      expect(stop.gestes).toHaveLength(count);
      expect(stop.gestes.map(geste => geste.intention)).toEqual(Array<string>(count).fill('FIN'));
      expect(stop.gestes.map(geste => (geste.intention === 'OUVERTURE' ? undefined : geste.cible))).toEqual(
        activites.map(activite => activite.ouverture),
      );
      expect(after.evenements.slice(0, before.evenements.length)).toEqual(before.evenements);
      expect(after.evenements.slice(before.evenements.length)).toEqual(stop.gestes.map(geste => ({ geste, etat: 'EN_ATTENTE' })));
      expect(after.pausesArretees).toEqual(['pause-de-midi']);
      expect(restoredWindow.commandesGlobales().permet('REPRENDRE')).toBe(false);
      expect(restoredWindow.commandesGlobales().permet('PAUSE')).toBe(false);
    },
  );

  it('should preserve the whole pause and pending history when the atomic stop write aborts', async () => {
    const before = await givenAStoredPause([]);
    const window = windowOf(before);
    const stop = window.prepareAcceptance(window.prepareToutArreter(() => ({ id: 'arret', dateDeSurvenue: '2026-09-05T12:00:00Z' })));
    givenTheBrowserAbortsWrites();

    const failed = whenAppendingStop(stop);
    await whenStopWriteSettles(failed);
    const after = await whenRestartingJournal();

    await expect(failed).rejects.toThrow('Transaction locale interrompue');
    expect(after).toEqual(before);
    expect(window.commandesGlobales().permet('REPRENDRE')).toBe(true);
  });

  it('should retain both active targets and the whole pause history after a two-finish stop transaction aborts and the adapter restarts', async () => {
    const before = await givenAStoredPause([
      {
        ouverture: 'a',
        operateurId: 'jean',
        categorie: 'TRAVAIL',
        depuis: '2026-09-05T08:00:00Z',
        echeance: '2026-09-05T21:00:00Z',
      },
      {
        ouverture: 'b',
        posteId: 'fraiseuse',
        operateurId: 'jean',
        categorie: 'NON_CONFORMITE',
        depuis: '2026-09-05T08:30:00Z',
        echeance: '2026-09-05T21:30:00Z',
      },
    ]);
    const window = windowOf(before);
    const stop = window.prepareAcceptance(
      new IntentionGlobaleInitiee('TOUT_ARRETER', { id: 'arret', dateDeSurvenue: '2026-09-05T12:00:00Z' }).prepare(window),
    );
    givenTheBrowserAbortsWrites();

    const failed = whenAppendingStop(stop);
    await whenStopWriteSettles(failed);
    const after = await whenRestartingJournal();
    const restoredWindow = windowOf(after);
    const retry = restoredWindow.prepareAcceptance(
      new IntentionGlobaleInitiee('TOUT_ARRETER', { id: 'arret-reessaye', dateDeSurvenue: '2026-09-05T12:00:00Z' }).prepare(restoredWindow),
    );

    await expect(failed).rejects.toThrow('Transaction locale interrompue');
    expect(after).toEqual(before);
    expect(stop.gestes).toMatchObject([
      { intention: 'FIN', cible: 'a', type: 'FIN' },
      { intention: 'FIN', cible: 'b', type: 'FIN', posteId: 'fraiseuse' },
    ]);
    expect(retry.gestes).toMatchObject([
      { intention: 'FIN', cible: 'a', type: 'FIN' },
      { intention: 'FIN', cible: 'b', type: 'FIN', posteId: 'fraiseuse' },
    ]);
    expect(restoredWindow.pointage().moules[0]?.isActive()).toBe(true);
    expect(restoredWindow.commandesGlobales().permet('PAUSE')).toBe(true);
  });

  const givenOtherCompanyAndDeviceDocuments = async (): Promise<void> => {
    await storage.update('atelier:entreprise-b', { ancien: true }, value => value);
    await storage.update('device-enrolment', 'secret-device', value => value);
    await storage.update('atelier-activites-v1:entreprise-b', EMPTY_JOURNAL_DU_PUPITRE, value => value);
  };
  const thenOnlyObsoleteWorkshopDocumentsAreGone = async (): Promise<void> => {
    expect(await storage.read('atelier:entreprise-a')).toBeUndefined();
    expect(await storage.read('atelier:entreprise-b')).toBeUndefined();
    expect(await storage.read('device-enrolment')).toBe('secret-device');
    expect(await storage.read('atelier-activites-v1:entreprise-b')).toEqual(EMPTY_JOURNAL_DU_PUPITRE);
  };
  const givenTheBrowserAbortsWrites = (): void => {
    const originalPut: unknown = Object.getOwnPropertyDescriptor(IDBObjectStore.prototype, 'put')?.value;
    if (typeof originalPut !== 'function') throw new Error('Missing IndexedDB put fixture.');
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      const request: unknown = Reflect.apply(originalPut, this, [value, key]);
      if (!(request instanceof IDBRequest)) throw new Error('Invalid IndexedDB write request fixture.');
      queueMicrotask(() => request.transaction?.abort());
      return request as IDBRequest<IDBValidKey>;
    });
  };
  const whenAppendingStop = (stop: { readonly gestes: readonly GesteDePointage[]; readonly repriseAEffacer?: string }): Promise<void> =>
    journal.append(Entreprise.of('entreprise-a'), stop.gestes, stop.repriseAEffacer);
  const whenStopWriteSettles = async (failed: Promise<void>): Promise<void> => {
    await Promise.allSettled([failed]);
    vi.restoreAllMocks();
  };
  const whenRestartingJournal = (): Promise<JournalDuPupitre> =>
    TestBed.runInInjectionContext(() => new IndexedDbJournauxDuPupitre()).read(Entreprise.of('entreprise-a'));
  const windowOf = (state: JournalDuPupitre): FenetreOperateur =>
    FenetreOperateur.open(
      Entreprise.of('entreprise-a'),
      state,
      Identifiant.empty().afterDigit('0').afterDigit('4').afterDigit('9'),
      Date.parse('2026-09-05T12:00:00Z'),
      new IdentiteDeFenetre(1),
    );
  const givenAStoredPause = async (activites: ReferentielDuPupitre['suivis'][number]['activites']): Promise<JournalDuPupitre> => {
    await journal.saveReferentiel(Entreprise.of('entreprise-a'), {
      operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', identifiant: '049', postes: [{ id: 'tour', libelle: 'Tour' }] }],
      suivis: [
        {
          id: 'piece',
          nom: 'OF-1',
          type: 'PRODUIT',
          etat: 'EN_COURS',
          activites: [
            {
              operateurId: 'jean',
              categorie: 'TRAVAIL',
              posteId: 'tour',
              ouverture: 'activite-fixture-47',
              depuis: '2026-09-05T07:00:00Z',
              echeance: '2026-09-05T20:00:00Z',
            },
            ...activites,
          ],
          conflits: [],
          evenements: [],
        },
      ],
    });
    await journal.append(Entreprise.of('entreprise-a'), [suspensionFixture]);
    return journal.read(Entreprise.of('entreprise-a'));
  };

  it('should acquire the storage synchronisation lock when synchronizing', async () => {
    const { entered, release, chronology } = givenSynchronizationSignals();

    const held = whenHoldingStorageLock(storage, 'synchronisation', entered, release, chronology);
    await whenTheFirstOperationHasEntered(entered);

    const queued = whenStartingSynchronization(journal, chronology);
    await whenAllowingTurnToEnter();

    const waitingChronology = [...chronology];

    await whenReleasingOperation(release, held);
    await queued;

    thenChronologyIs(waitingChronology, ['lock-entered']);
    thenChronologyIs(chronology, ['lock-entered', 'lock-released', 'journal-run']);
  });

  const givenALegacyAcceptedArrival = async (): Promise<void> => {
    const legacy = {
      connecte: true,
      referentiel: { operateurs: [{ id: 'jean', nom: 'Dupont', prenom: 'Jean', etat: 'EN_PAUSE', postes: [] }], suivis: [] },
      evenements: [
        {
          geste: { id: 'ancienne-arrivee', nature: 'ARRIVEE', dateDeSurvenue: '2026-09-05T08:00:00Z', operateurId: 'jean' },
          etat: 'ACCEPTE',
          journeeOuverte: true,
        },
        {
          geste: { id: 'ancien-depart', nature: 'DEPART', dateDeSurvenue: '2026-09-05T12:00:00Z', operateurId: 'jean' },
          etat: 'EN_ATTENTE',
        },
        {
          geste: {
            id: 'ancien-pointage',
            nature: 'POINTAGE',
            type: 'FIN',
            suiviId: 'piece',
            dateDeSurvenue: '2026-09-05T12:00:00Z',
            operateurId: 'jean',
          },
          etat: 'EN_ATTENTE',
        },
      ],
    };
    await storage.update('atelier:entreprise-a', legacy, () => legacy);
  };
  const whenReadingCompany = (company: string): Promise<JournalDuPupitre> => journal.read(Entreprise.of(company));
  const whenHoldingStorageLock = (
    store: LocalStoragePort,
    lockName: string,
    entered: SignalFixture,
    release: SignalFixture,
    chronology: string[],
  ): Promise<void> =>
    store.lock(lockName, async () => {
      chronology.push('lock-entered');
      entered.release();
      await release.promise;
      chronology.push('lock-released');
    });
  const whenStartingSynchronization = (j: IndexedDbJournauxDuPupitre, chronology: string[]): Promise<void> =>
    j.synchronize(() => {
      chronology.push('journal-run');
      return Promise.resolve();
    });
  const whenAllowingTurnToEnter = (): Promise<void> => new Promise(resolve => setTimeout(resolve));
});
