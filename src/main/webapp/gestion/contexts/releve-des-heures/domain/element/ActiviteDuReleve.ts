import { InstantDeReleve } from '../releve/InstantDeReleve';

export type ActiviteDuReleve =
  | {
      readonly debut: InstantDeReleve;
      readonly etat: 'TERMINEE' | 'TERMINEE_AUTOMATIQUEMENT';
      readonly fin: InstantDeReleve;
    }
  | { readonly debut: InstantDeReleve; readonly etat: 'EN_COURS' };
