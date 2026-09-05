import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { EMPTY_PUPITRE, LocalGeste, LocalPupitreState, ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/LocalPupitreState';
import { PupitreJournalPort } from '@/pupitre/contexts/atelier/domain/PupitreJournalPort';
import { PupitreServerPort } from '@/pupitre/contexts/atelier/domain/PupitreServerPort';
import { Injector } from '@angular/core';
import { PupitreJournalFixture } from '@test/unit/fixtures/PupitreJournalFixture';
import { PupitreSynchronization } from './PupitreSynchronization';

const referenceFixture: ReferentielDuPupitre = { operateurs: [], suivis: [] };
const gesteFixture: LocalGeste = { id: 'arrivee', dateDeSurvenue: '2026-09-05T08:00:00Z', operateurId: 'jean', nature: 'ARRIVEE' };

class UnavailableServerFixture extends PupitreServerPort {
  override referentiel(): Promise<ReferentielDuPupitre> {
    throw new Error('Aucun echange sans autorisation');
  }
  override send(): Promise<void> {
    throw new Error('Aucun echange sans autorisation');
  }
  override reread(): Promise<void> {
    throw new Error('Aucun echange sans autorisation');
  }
}

describe('PupitreSynchronization', () => {
  let journal: PupitreJournalFixture;
  let synchronisation: PupitreSynchronization;
  let exposed: LocalPupitreState | undefined;

  beforeEach(() => {
    journal = new PupitreJournalFixture();
    exposed = undefined;
    synchronisation = Injector.create({
      providers: [
        PupitreSynchronization,
        { provide: PupitreJournalPort, useValue: journal },
        { provide: PupitreServerPort, useValue: new UnavailableServerFixture() },
        {
          provide: AuthenticationPort,
          useValue: {
            synchronizeSession: () => new Promise<void>(resolve => setTimeout(resolve)),
            currentTenant: () => 'entreprise-a',
            currentToken: () => undefined,
          },
        },
      ],
    }).get(PupitreSynchronization);
  });

  it('should restore the selected company without attempting to exchange its pending gestures when authorization expired', async () => {
    await givenASelectedCompanyWithPendingWork();

    await whenSynchronizing();

    thenPendingWorkRemainsAvailable();
  });

  const givenASelectedCompanyWithPendingWork = async (): Promise<void> => {
    await journal.saveReferentiel('entreprise-a', referenceFixture);
    await journal.append('entreprise-a', [gesteFixture]);
  };

  const whenSynchronizing = (): Promise<void> =>
    synchronisation.synchronize((_entreprise, state) => {
      exposed = state;
    });
  const thenPendingWorkRemainsAvailable = (): void => {
    expect(exposed).toEqual({ ...EMPTY_PUPITRE, referentiel: referenceFixture, evenements: [{ geste: gesteFixture, etat: 'EN_ATTENTE' }] });
  };
});
