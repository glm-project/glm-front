import { authProvider } from '@/pupitre/auth.provider';
import { LocalGeste, LocalPupitreState, ReferentielDuPupitre } from '@/pupitre/contexts/atelier/domain/LocalPupitreState';
import { PupitreJournalPort } from '@/pupitre/contexts/atelier/domain/PupitreJournalPort';
import { offlineProvider } from '@/pupitre/offline.provider';
import { enableProdMode } from '@angular/core';
import { createApplication } from '@angular/platform-browser';

export interface ProductionPupitreFixture {
  prepare(entreprise: string, referentiel: ReferentielDuPupitre, geste: LocalGeste): Promise<void>;
  read(entreprise: string): Promise<LocalPupitreState>;
}

declare global {
  interface Window {
    pupitreProductionFixture?: ProductionPupitreFixture;
  }
}

enableProdMode();

createApplication({ providers: [authProvider, offlineProvider] })
  .then(application => {
    const journal = application.injector.get(PupitreJournalPort);
    window.pupitreProductionFixture = {
      prepare: async (entreprise, referentiel, geste) => {
        await journal.saveReferentiel(entreprise, referentiel);
        await journal.append(entreprise, [geste]);
      },
      read: entreprise => journal.read(entreprise),
    };
  })
  .catch((failure: unknown) => console.error(failure));
