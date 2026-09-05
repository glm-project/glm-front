import { JournalDuPupitrePort } from '@/app/atelier/domain/JournalDuPupitrePort';
import { GesteLocal, PUPITRE_VIDE, PupitreLocal, ReferentielDuPupitre } from '@/app/atelier/domain/PupitreLocal';
import { ServeurDuPupitrePort } from '@/app/atelier/domain/ServeurDuPupitrePort';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { Injector } from '@angular/core';
import { JournalDuPupitreFixture } from '@test/unit/fixtures/JournalDuPupitreFixture';
import { SynchronisationDuPupitre } from './SynchronisationDuPupitre';

const referenceFixture: ReferentielDuPupitre = { operateurs: [], suivis: [] };
const gesteFixture: GesteLocal = { id: 'arrivee', dateDeSurvenue: '2026-09-05T08:00:00Z', operateurId: 'jean', nature: 'ARRIVEE' };

class ServeurInaccessibleFixture extends ServeurDuPupitrePort {
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

describe('SynchronisationDuPupitre', () => {
  let journal: JournalDuPupitreFixture;
  let synchronisation: SynchronisationDuPupitre;
  let exposed: PupitreLocal | undefined;

  beforeEach(() => {
    journal = new JournalDuPupitreFixture();
    exposed = undefined;
    synchronisation = Injector.create({
      providers: [
        SynchronisationDuPupitre,
        { provide: JournalDuPupitrePort, useValue: journal },
        { provide: ServeurDuPupitrePort, useValue: new ServeurInaccessibleFixture() },
        {
          provide: AuthenticationPort,
          useValue: {
            synchronizeSession: () => new Promise<void>(resolve => setTimeout(resolve)),
            currentTenant: () => 'entreprise-a',
            currentToken: () => undefined,
          },
        },
      ],
    }).get(SynchronisationDuPupitre);
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
    expect(exposed).toEqual({ ...PUPITRE_VIDE, referentiel: referenceFixture, evenements: [{ geste: gesteFixture, etat: 'EN_ATTENTE' }] });
  };
});
