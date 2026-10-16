import { Duree } from './Duree';
import { InstantDeLaJournee } from './InstantDeLaJournee';

export type EtatDActivite =
  | { readonly kind: 'EN_COURS' }
  | {
      readonly kind: 'TERMINEE' | 'TERMINEE_AUTOMATIQUEMENT';
      readonly fin: InstantDeLaJournee;
      readonly dureeSurLeJour: Duree;
    };
