import { TypeScriptChargementDeLAtelier } from '@/pupitre/contexts/atelier/infrastructure/primary/TypeScriptChargementDeLAtelier';
import { ChargementDeLAtelierPort } from '@/pupitre/contexts/enrolement/domain/ChargementDeLAtelierPort';
import { Provider } from '@angular/core';
import { AtelierChargement } from './AtelierChargement';

export const chargementProviders: Provider[] = [
  TypeScriptChargementDeLAtelier,
  { provide: ChargementDeLAtelierPort, useClass: AtelierChargement },
];
