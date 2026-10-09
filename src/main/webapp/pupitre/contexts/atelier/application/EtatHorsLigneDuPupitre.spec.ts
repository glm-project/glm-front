import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { Entreprise } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/Entreprise';
import {
  EMPTY_JOURNAL_DU_PUPITRE,
  EvenementEnAttente,
  JournalDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { Injector } from '@angular/core';
import { dureeMaximaleFixtureEnMs } from '@test/unit/fixtures/pupitre/atelier/DureeMaximaleFixture';
import { JournauxDuPupitreFixture } from '@test/unit/fixtures/pupitre/atelier/JournauxDuPupitreFixture';
import { EtatHorsLigneDuPupitre, SourceDOuverture } from './EtatHorsLigneDuPupitre';
import { PupitreSynchronization } from './PupitreSynchronization';

const UNE_HEURE = 3_600_000;

describe('EtatHorsLigneDuPupitre', () => {
  let etatHorsLigne: EtatHorsLigneDuPupitre;
  let journal: JournauxDuPupitreFixture;
  let tenant: string | undefined;
  let syncCallback: ((entreprise: string | undefined, state: JournalDuPupitre) => void) | undefined;

  beforeEach(() => {
    journal = new JournauxDuPupitreFixture();
    tenant = 'entreprise-a';
    syncCallback = undefined;

    etatHorsLigne = Injector.create({
      providers: [
        EtatHorsLigneDuPupitre,
        { provide: JournauxDuPupitrePort, useValue: journal },
        {
          provide: AuthenticationPort,
          useValue: {
            synchronizeSession: () => Promise.resolve(),
            currentTenant: () => tenant,
            currentToken: () => 'token',
          },
        },
        {
          provide: PupitreSynchronization,
          useValue: {
            synchronize: (onUpdate: (entreprise: string | undefined, state: JournalDuPupitre) => void): Promise<void> => {
              syncCallback = onUpdate;
              return Promise.resolve();
            },
          },
        },
      ],
    }).get(EtatHorsLigneDuPupitre);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize connection state as connected', () => {
    thenConnectionIs(true);
  });

  it('should ignore incoming synchronization state when the tenant has changed', async () => {
    let reconciled = false;
    await whenRefreshingSynchronize(() => {
      reconciled = true;
    });

    whenTenantChangesTo('autre-entreprise');
    syncCallback?.('entreprise-a', { ...EMPTY_JOURNAL_DU_PUPITRE, connecte: false });

    thenReconciliationWasSkipped(reconciled);
    thenConnectionIs(true);
  });

  it('should restore the disconnected journal state', async () => {
    givenDisconnectedStateInJournal('entreprise-a');
    await whenRefreshingRestore();

    thenConnectionIs(false);
  });

  it('should preserve disconnection when restoring without an enrolled tenant', async () => {
    givenDisconnectedStateInJournal('entreprise-a');
    await whenRefreshingRestore();
    whenTenantChangesTo(undefined);
    let reconciledWithTenant: Entreprise | undefined = Entreprise.of('initial');
    await whenRefreshingRestore(entreprise => {
      reconciledWithTenant = entreprise;
    });

    thenReconciledTenantIs(reconciledWithTenant, undefined);
    thenConnectionIs(false);
  });

  it('should fail opening source when device has no enrolled tenant', async () => {
    whenTenantChangesTo(undefined);

    await expect(whenOpeningSource()).rejects.toThrow('Le pupitre doit etre enrole une premiere fois.');
  });

  it('should fail opening source when tenant changes while reading the journal', async () => {
    journal.afterRead = () => {
      tenant = 'entreprise-b';
    };

    await expect(whenOpeningSource()).rejects.toThrow('L’entreprise du pupitre a change.');
  });

  it('should publish given journal state to view', () => {
    const state: JournalDuPupitre = {
      ...EMPTY_JOURNAL_DU_PUPITRE,
      referentiel: {
        operateurs: [{ id: 'op1', identifiant: '123', nom: 'Durand', prenom: 'Paul', postes: [] }],
        suivis: [],
        categories: [],
        dureeMaximaleDActiviteEnMs: dureeMaximaleFixtureEnMs,
      },
    };

    whenPublishing(state);

    thenReferentielContainsOperator(state.referentiel?.operateurs[0]?.nom ?? '');
  });

  it('should signal a publication delay once the clock is pushed past one hour', () => {
    const geste = givenPendingGesture();
    whenPublishing({ ...EMPTY_JOURNAL_DU_PUPITRE, evenements: [geste] });

    whenTheClockIsPushedTo(Date.parse(geste.geste.dateDeSurvenue) + 2 * UNE_HEURE);

    thenPublicationDelayIs({ gestes: 1, depuis: 2 * UNE_HEURE });
  });

  const givenPendingGesture = (): EvenementEnAttente => ({
    etat: 'EN_ATTENTE',
    geste: {
      nature: 'POINTAGE',
      type: 'DEBUT',
      id: 'geste',
      operateurId: 'jean',
      suiviId: 'piece',
      dateDeSurvenue: new Date().toISOString(),
    },
  });

  const givenDisconnectedStateInJournal = (entreprise: string): void => {
    journal.seedJournal(Entreprise.of(entreprise), { ...EMPTY_JOURNAL_DU_PUPITRE, connecte: false });
  };

  const whenTenantChangesTo = (newTenant: string | undefined): void => {
    tenant = newTenant;
  };

  const whenRefreshingSynchronize = async (
    reconcile: (entreprise: Entreprise | undefined, state: JournalDuPupitre) => void,
  ): Promise<void> => {
    await etatHorsLigne.refresh('SYNCHRONIZE', reconcile);
  };

  const whenRefreshingRestore = async (
    reconcile: (entreprise: Entreprise | undefined, state: JournalDuPupitre) => void = () => undefined,
  ): Promise<void> => {
    await etatHorsLigne.refresh('RESTORE', reconcile);
  };

  const whenTimePassesTo = (instant: number): void => {
    vi.setSystemTime(instant);
  };

  const whenTheClockIsPushedTo = (instant: number): void => {
    whenTimePassesTo(instant);
    etatHorsLigne.updateClock();
  };

  const whenOpeningSource = async (): Promise<SourceDOuverture> => etatHorsLigne.openingSource();

  const whenPublishing = (state: JournalDuPupitre): void => {
    etatHorsLigne.publish(state);
  };

  const thenPublicationDelayIs = (expected: { gestes: number; depuis: number }): void => {
    expect(etatHorsLigne.retardDePublication()).toEqual(expected);
  };

  const thenConnectionIs = (expected: boolean): void => {
    expect(etatHorsLigne.connected()).toBe(expected);
  };

  const thenReconciliationWasSkipped = (reconciled: boolean): void => {
    expect(reconciled).toBe(false);
  };

  const thenReconciledTenantIs = (actual: Entreprise | undefined, expected: Entreprise | undefined): void => {
    expect(Entreprise.same(actual, expected)).toBe(true);
  };

  const thenReferentielContainsOperator = (expectedNom: string): void => {
    expect(etatHorsLigne.referentiel()?.operateurs.some(o => o.nom === expectedNom)).toBe(true);
  };
});
