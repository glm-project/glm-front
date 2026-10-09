import { formatInstantTimeUnambiguous } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { DossierAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { InstantPointage } from '../../../domain/dossier/InstantPointage';
import { BornesDeLaFin, CadreDeLaFin } from '../../../domain/regularisation/CadreDeLaFin';

export type DemandeDeDeplacement =
  | { readonly kind: 'DE'; readonly minutes: number }
  | { readonly kind: 'BORNE'; readonly borne: 'MIN' | 'MAX' }
  | { readonly kind: 'VERS'; readonly instant: number };

export interface PlacementDeLInstant {
  readonly bornes: BornesDeLaFin;
}

export interface PlacementDemande {
  readonly demande: DemandeDeDeplacement;
}

export interface PoigneeDeFrise {
  readonly instant: string;
  readonly bornes: BornesDeLaFin;
}

type DossierDeLaFrise = Pick<DossierAnomalie, 'activite' | 'borneDeFin'>;

export const bornesDuFait = (dossier: DossierDeLaFrise, maintenant: string): BornesDeLaFin =>
  CadreDeLaFin.depuis(dossier, maintenant).bornes();

export const texteDeLHeure = (instant: string): string => formatInstantTimeUnambiguous(new Date(instant));

const MINUTES_PAR_FLECHE = 1;
const MINUTES_PAR_FLECHE_AVEC_MAJ = 15;
const SENS_DES_FLECHES: ReadonlyMap<string, 1 | -1> = new Map([
  ['ArrowRight', 1],
  ['ArrowUp', 1],
  ['ArrowLeft', -1],
  ['ArrowDown', -1],
]);
const BORNES_DES_TOUCHES: ReadonlyMap<string, 'MIN' | 'MAX'> = new Map([
  ['Home', 'MIN'],
  ['End', 'MAX'],
]);

export const demandeDeLaTouche = (touche: Pick<KeyboardEvent, 'key' | 'shiftKey'>): DemandeDeDeplacement | undefined => {
  const sens = SENS_DES_FLECHES.get(touche.key);
  if (sens !== undefined) return { kind: 'DE', minutes: sens * (touche.shiftKey ? MINUTES_PAR_FLECHE_AVEC_MAJ : MINUTES_PAR_FLECHE) };
  const borne = BORNES_DES_TOUCHES.get(touche.key);
  return borne === undefined ? undefined : { kind: 'BORNE', borne };
};

export const poigneeDuDossier = (dossier: DossierDeLaFrise, instant: string, maintenant: string): PoigneeDeFrise | undefined =>
  new InstantPointage(instant).isValid() ? { instant, bornes: bornesDuFait(dossier, maintenant) } : undefined;

export const placementDuDossier = (dossier: DossierDeLaFrise, instant: string, maintenant: string): PlacementDeLInstant | undefined =>
  new InstantPointage(instant).isValid() ? undefined : { bornes: bornesDuFait(dossier, maintenant) };

export interface DeplacementDemande {
  readonly demande: DemandeDeDeplacement;
  readonly poignee: PoigneeDeFrise;
}
