import { ActiviteReleveId } from '../releve/ActiviteReleveId';
import { InstantDeReleve } from '../releve/InstantDeReleve';

export type ActiviteDuReleve =
  | {
      readonly id: ActiviteReleveId;
      readonly debut: InstantDeReleve;
      readonly etat: 'TERMINEE' | 'TERMINEE_AUTOMATIQUEMENT';
      readonly fin: InstantDeReleve;
    }
  | { readonly id: ActiviteReleveId; readonly debut: InstantDeReleve; readonly etat: 'EN_COURS' }
  | {
      readonly id: ActiviteReleveId;
      readonly debut: InstantDeReleve;
      readonly etat: 'A_RESOUDRE';
      readonly finAuPlusTard: InstantDeReleve | undefined;
    };
