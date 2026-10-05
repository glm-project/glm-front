import { EffacementDesJournauxPort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/EffacementDesJournauxPort';
import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import { EMPTY_JOURNAL_DU_PUPITRE, GesteDePointage } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { LocalStoragePort } from '@/pupitre/shared/local-storage/domain/LocalStoragePort';
import { IndexedDbLocalStorage } from '@/pupitre/shared/local-storage/infrastructure/secondary/IndexedDbLocalStorage';
import { TestBed } from '@angular/core/testing';
import { BrowserLocksFixture } from '@test/unit/fixtures/BrowserLocksFixture';
import { EffacementDesJournauxFixture } from '@test/unit/fixtures/pupitre/atelier/EffacementDesJournauxFixture';
import { JournauxDuPupitreFixture } from '@test/unit/fixtures/pupitre/atelier/JournauxDuPupitreFixture';
import { IDBFactory } from 'fake-indexeddb';
import { IndexedDbEffacementDesJournaux } from './local/IndexedDbEffacementDesJournaux';
import { IndexedDbJournauxDuPupitre } from './local/IndexedDbJournauxDuPupitre';

interface JournauxEtEffacement {
  readonly journaux: JournauxDuPupitrePort;
  readonly effacement: EffacementDesJournauxPort;
}

const gesteFixture = (id: string): GesteDePointage => ({
  nature: 'POINTAGE',
  id,
  dateDeSurvenue: '2026-09-05T08:00:00Z',
  operateurId: 'jean',
  suiviId: 'piece',
  intention: 'OUVERTURE',
  type: 'DEBUT',
});

const adapters = [
  [
    'local storage',
    (): JournauxEtEffacement => ({
      journaux: TestBed.inject(IndexedDbJournauxDuPupitre),
      effacement: TestBed.inject(IndexedDbEffacementDesJournaux),
    }),
  ],
  [
    'application fixture',
    (): JournauxEtEffacement => {
      const journaux = new JournauxDuPupitreFixture();
      return { journaux, effacement: new EffacementDesJournauxFixture(journaux) };
    },
  ],
] as const;

const entrepriseA = Entreprise.of('entreprise-a');
const entrepriseB = Entreprise.of('entreprise-b');

describe.each(adapters)('EffacementDesJournauxPort contract, honoured by %s', (_name, build) => {
  let journaux: JournauxDuPupitrePort;
  let effacement: EffacementDesJournauxPort;

  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.stubGlobal('navigator', { locks: new BrowserLocksFixture() });
    TestBed.configureTestingModule({
      providers: [
        IndexedDbJournauxDuPupitre,
        IndexedDbEffacementDesJournaux,
        { provide: LocalStoragePort, useClass: IndexedDbLocalStorage },
      ],
    });
    ({ journaux, effacement } = build());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should erase the journal of every company, pending gestures included', async () => {
    await givenAPendingGestureInTwoCompanies();

    await whenErasingEveryJournal();

    await thenTheJournalIsEmpty(entrepriseA);
    await thenTheJournalIsEmpty(entrepriseB);
  });

  it('should let a company journal start again from nothing after the erasure', async () => {
    await givenAPendingGestureInTwoCompanies();
    await whenErasingEveryJournal();

    await whenAppendingAGesture(entrepriseA, 'apres-effacement');

    await thenTheJournalHoldsOnly(entrepriseA, 'apres-effacement');
  });

  const givenAPendingGestureInTwoCompanies = async (): Promise<void> => {
    await journaux.append(entrepriseA, [gesteFixture('geste-a')]);
    await journaux.append(entrepriseB, [gesteFixture('geste-b')]);
  };

  const whenErasingEveryJournal = (): Promise<void> => effacement.discardAll();

  const whenAppendingAGesture = (entreprise: Entreprise, id: string): Promise<void> => journaux.append(entreprise, [gesteFixture(id)]);

  const thenTheJournalIsEmpty = async (entreprise: Entreprise): Promise<void> => {
    expect(await journaux.read(entreprise)).toEqual(EMPTY_JOURNAL_DU_PUPITRE);
  };

  const thenTheJournalHoldsOnly = async (entreprise: Entreprise, id: string): Promise<void> => {
    expect((await journaux.read(entreprise)).evenements).toEqual([{ geste: gesteFixture(id), etat: 'EN_ATTENTE' }]);
  };
});

describe('IndexedDbEffacementDesJournaux', () => {
  let storage: LocalStoragePort;
  let effacement: EffacementDesJournauxPort;

  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.stubGlobal('navigator', { locks: new BrowserLocksFixture() });
    TestBed.configureTestingModule({
      providers: [IndexedDbEffacementDesJournaux, { provide: LocalStoragePort, useClass: IndexedDbLocalStorage }],
    });
    storage = TestBed.inject(LocalStoragePort);
    effacement = TestBed.inject(IndexedDbEffacementDesJournaux);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should keep the device credentials and its enrolment when erasing the journals', async () => {
    await givenADeviceEnrolmentAndAJournal();

    await effacement.discardAll();

    await thenTheEnrolmentIsKept();
    await thenTheJournalIsGone();
  });

  const givenADeviceEnrolmentAndAJournal = async (): Promise<void> => {
    await storage.update('enrolement', 'session-de-l-appareil', value => value);
    await storage.update('atelier-activites-v1:entreprise-a', EMPTY_JOURNAL_DU_PUPITRE, value => value);
  };

  const thenTheEnrolmentIsKept = async (): Promise<void> => {
    expect(await storage.read('enrolement')).toBe('session-de-l-appareil');
  };

  const thenTheJournalIsGone = async (): Promise<void> => {
    expect(await storage.read('atelier-activites-v1:entreprise-a')).toBeUndefined();
  };
});
