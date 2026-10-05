import { TypeScriptEffacementDesJournaux } from '@/pupitre/contexts/atelier/infrastructure/primary/TypeScriptEffacementDesJournaux';
import { JournauxDeLAtelierPort } from '@/pupitre/contexts/enrolement/domain/JournauxDeLAtelierPort';
import { Provider } from '@angular/core';
import { AtelierJournaux } from './AtelierJournaux';

export const journauxProviders: Provider[] = [
  TypeScriptEffacementDesJournaux,
  { provide: JournauxDeLAtelierPort, useClass: AtelierJournaux },
];
