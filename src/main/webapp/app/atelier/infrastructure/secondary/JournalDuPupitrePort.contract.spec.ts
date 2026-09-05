import { JournalDuPupitrePort } from '@/app/atelier/domain/JournalDuPupitrePort';
import { EvenementLocal, GesteLocal, PUPITRE_VIDE, PupitreLocal, ReferentielDuPupitre } from '@/app/atelier/domain/PupitreLocal';
import { StockageLocalPort } from '@/app/shared/stockage-local/domain/StockageLocalPort';
import { IndexedDbStockageLocal } from '@/app/shared/stockage-local/infrastructure/secondary/IndexedDbStockageLocal';
import { TestBed } from '@angular/core/testing';
import { BrowserLocksFixture } from '@test/unit/fixtures/BrowserLocksFixture';
import { JournalDuPupitreFixture } from '@test/unit/fixtures/JournalDuPupitreFixture';
import { SignalFixture } from '@test/unit/fixtures/SignalFixture';
import { IDBFactory } from 'fake-indexeddb';
import { JournalLocalDuPupitre } from './local/JournalLocalDuPupitre';

const referenceFixture: ReferentielDuPupitre = { operateurs: [], suivis: [] };
const arriveeFixture: GesteLocal = { nature: 'ARRIVEE', id: 'arrivee', dateDeSurvenue: '2026-09-05T08:00:00Z', operateurId: 'jean' };
const repriseFixture: GesteLocal = { ...arriveeFixture, id: 'reprise', nature: 'PRESENCE', type: 'REPRISE', implicite: true };
const pointageFixture: GesteLocal = { ...arriveeFixture, id: 'pointage', nature: 'POINTAGE', type: 'DEBUT', suiviId: 'piece' };

const adapters = [
  ['local storage', () => TestBed.inject(JournalLocalDuPupitre)],
  ['application fixture', () => new JournalDuPupitreFixture()],
] as const;

describe.each(adapters)('JournalDuPupitrePort contract, honoured by %s', (_name, build) => {
  let journal: JournalDuPupitrePort;

  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.stubGlobal('navigator', { locks: new BrowserLocksFixture() });
    TestBed.configureTestingModule({
      providers: [JournalLocalDuPupitre, { provide: StockageLocalPort, useClass: IndexedDbStockageLocal }],
    });
    journal = build();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('should restore an empty company before its first reference or gesture', async () => {
    const state = await journal.read('entreprise-a');

    thenStateIs(state, PUPITRE_VIDE);
  });

  it('should retain the complete opening in order and keep another company independent', async () => {
    await journal.saveReferentiel('entreprise-a', referenceFixture);

    await journal.append('entreprise-a', [arriveeFixture, repriseFixture, pointageFixture]);

    thenStateIs(await journal.read('entreprise-a'), {
      referentiel: referenceFixture,
      connecte: true,
      evenements: [arriveeFixture, repriseFixture, pointageFixture].map(geste => ({ geste, etat: 'EN_ATTENTE' })),
    });
    thenStateIs(await journal.read('entreprise-b'), PUPITRE_VIDE);
  });

  it('should preserve a concurrent append and a refusal while recording a push outcome', async () => {
    await journal.append('entreprise-a', [arriveeFixture, repriseFixture]);
    await journal.markDisconnected('entreprise-a');
    const refus: EvenementLocal = { geste: arriveeFixture, etat: 'REFUSE', refus: { code: 'cause', message: 'cause conservee' } };

    await Promise.all([journal.saveResult('entreprise-a', refus), journal.append('entreprise-a', [pointageFixture])]);

    thenStateIs(await journal.read('entreprise-a'), {
      connecte: true,
      evenements: [refus, { geste: repriseFixture, etat: 'EN_ATTENTE' }, { geste: pointageFixture, etat: 'EN_ATTENTE' }],
    });
  });

  it.each(['synchronize', 'withSession'] as const)('should serialize %s operations while allowing local capture', async operation => {
    const entered = new SignalFixture();
    const release = new SignalFixture();
    const chronology: string[] = [];
    const first = journal[operation](async () => {
      chronology.push('first');
      entered.release();
      await release.promise;
    });
    await entered.promise;

    const second = journal[operation](async () => {
      await new Promise(resolve => setTimeout(resolve));
      chronology.push('second');
    });
    await journal.append('entreprise-a', [arriveeFixture]);

    try {
      thenChronologyIs(chronology, ['first']);
    } finally {
      release.release();
      await Promise.all([first, second]);
    }
    thenChronologyIs(chronology, ['first', 'second']);
  });

  const thenStateIs = (state: PupitreLocal, expected: PupitreLocal): void => {
    expect(state).toEqual(expected);
  };
  const thenChronologyIs = (chronology: string[], expected: string[]): void => {
    expect(chronology).toEqual(expected);
  };
});
