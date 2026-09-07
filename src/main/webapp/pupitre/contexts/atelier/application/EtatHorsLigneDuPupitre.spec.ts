import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import {
  EMPTY_JOURNAL_DU_PUPITRE,
  EvenementDuJournal,
  JournalDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { Injector } from '@angular/core';
import { JournauxDuPupitreFixture } from '@test/unit/fixtures/pupitre/atelier/JournauxDuPupitreFixture';
import { EtatHorsLigneDuPupitre, SourceDOuverture } from './EtatHorsLigneDuPupitre';
import { PupitreSynchronization } from './PupitreSynchronization';

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

  it('should reset view to empty journal and preserve connection signal when restoring without an enrolled tenant', async () => {
    givenDisconnectedStateInJournal('entreprise-a');
    await whenRefreshingRestore();
    thenConnectionIs(false);

    whenTenantChangesTo(undefined);
    let reconciledWithTenant: string | undefined = 'initial';
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

  it('should read diagnostics from journal filtering refused events', async () => {
    const refusedEvent: EvenementDuJournal = {
      geste: { id: 'g1', dateDeSurvenue: '2026-09-06T10:00:00Z', operateurId: 'jean', nature: 'ARRIVEE' },
      etat: 'REFUSE',
      refus: { code: 'refuse', message: 'erreur' },
    };
    const acceptedEvent: EvenementDuJournal = {
      geste: { id: 'g2', dateDeSurvenue: '2026-09-06T10:05:00Z', operateurId: 'jean', nature: 'ARRIVEE' },
      etat: 'ACCEPTE',
      journeeOuverte: true,
    };
    givenEventsInJournal('entreprise-a', [refusedEvent, acceptedEvent]);

    const diagnostics = await whenReadingDiagnostics();

    thenDiagnosticsContainOnlyRefusedEvents(diagnostics, [refusedEvent]);
  });

  it('should publish given journal state to view', () => {
    const state: JournalDuPupitre = {
      ...EMPTY_JOURNAL_DU_PUPITRE,
      referentiel: { operateurs: [{ id: 'op1', matricule: '123', nom: 'Durand', prenom: 'Paul', postes: [] }], suivis: [] },
    };

    whenPublishing(state);

    thenReferentielContainsOperator(state.referentiel?.operateurs[0]?.nom ?? '');
  });

  const givenDisconnectedStateInJournal = (entreprise: string): void => {
    journal.seedJournal(entreprise, { ...EMPTY_JOURNAL_DU_PUPITRE, connecte: false });
  };

  const givenEventsInJournal = (entreprise: string, evenements: EvenementDuJournal[]): void => {
    journal.seedJournal(entreprise, { ...EMPTY_JOURNAL_DU_PUPITRE, evenements });
  };

  const whenTenantChangesTo = (newTenant: string | undefined): void => {
    tenant = newTenant;
  };

  const whenRefreshingSynchronize = async (reconcile: (entreprise: string | undefined, state: JournalDuPupitre) => void): Promise<void> => {
    await etatHorsLigne.refresh('SYNCHRONIZE', reconcile);
  };

  const whenRefreshingRestore = async (
    reconcile: (entreprise: string | undefined, state: JournalDuPupitre) => void = () => undefined,
  ): Promise<void> => {
    await etatHorsLigne.refresh('RESTORE', reconcile);
  };

  const whenOpeningSource = async (): Promise<SourceDOuverture> => etatHorsLigne.openingSource();

  const whenReadingDiagnostics = async (): Promise<readonly EvenementDuJournal[]> => etatHorsLigne.diagnostics();

  const whenPublishing = (state: JournalDuPupitre): void => {
    etatHorsLigne.publish(state);
  };

  const thenConnectionIs = (expected: boolean): void => {
    expect(etatHorsLigne.connected()).toBe(expected);
  };

  const thenReconciliationWasSkipped = (reconciled: boolean): void => {
    expect(reconciled).toBe(false);
  };

  const thenReconciledTenantIs = (actual: string | undefined, expected: string | undefined): void => {
    expect(actual).toBe(expected);
  };

  const thenDiagnosticsContainOnlyRefusedEvents = (actual: readonly EvenementDuJournal[], expected: EvenementDuJournal[]): void => {
    expect(actual).toEqual(expected);
  };

  const thenReferentielContainsOperator = (expectedNom: string): void => {
    expect(etatHorsLigne.referentiel()?.operateurs.some(o => o.nom === expectedNom)).toBe(true);
  };
});
