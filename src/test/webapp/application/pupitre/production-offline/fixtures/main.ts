import { authProvider } from '@/pupitre/auth.provider';
import {
  GesteDAtelier,
  JournalDuPupitre,
  ReferentielDuPupitre,
} from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';
import { JournauxDuPupitrePort } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournauxDuPupitrePort';
import { offlineProvider } from '@/pupitre/offline.provider';
import { enableProdMode } from '@angular/core';
import { createApplication } from '@angular/platform-browser';

export interface ProductionPupitreFixture {
  prepare(entreprise: string, referentiel: ReferentielDuPupitre, geste: GesteDAtelier): Promise<void>;
  read(entreprise: string): Promise<JournalDuPupitre>;
  waitForSynchronization(): Promise<void>;
}

declare global {
  interface Window {
    pupitreProductionFixture?: ProductionPupitreFixture;
  }
}

enableProdMode();

createApplication({ providers: [authProvider, offlineProvider] })
  .then(application => {
    const journal = application.injector.get(JournauxDuPupitrePort);
    window.pupitreProductionFixture = {
      prepare: async (entreprise, referentiel, geste) => {
        await journal.saveReferentiel(entreprise, referentiel);
        await journal.append(entreprise, [geste]);
      },
      read: entreprise => journal.read(entreprise),
      waitForSynchronization: () => journal.synchronize(() => Promise.resolve()),
    };
  })
  .catch((failure: unknown) => console.error(failure));
