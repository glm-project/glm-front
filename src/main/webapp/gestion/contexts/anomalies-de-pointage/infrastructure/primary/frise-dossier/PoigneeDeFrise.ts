import { formatInstantTimeUnambiguous } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { CadreDuFait } from '../../../domain/acte/CadreDuFait';
import { InstantPointage } from '../../../domain/acte/InstantPointage';
import { DossierAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { finDeLaPortee, instantsRecus } from './EchelleFrise';
import { pointagesDeLaFrise } from './PointagesDeLaFrise';

export interface BornesDePoignee {
  readonly min: string;
  readonly max: string;
}

export type DemandeDeDeplacement =
  | { readonly kind: 'DE'; readonly minutes: number }
  | { readonly kind: 'BORNE'; readonly borne: 'MIN' | 'MAX' }
  | { readonly kind: 'VERS'; readonly instant: number };

export interface PlacementDeLInstant {
  readonly bornes: BornesDePoignee;
}

export interface PlacementDemande {
  readonly demande: DemandeDeDeplacement;
}

export interface PoigneeDeFrise {
  readonly instant: string;
  readonly bornes: BornesDePoignee;
}

type DossierDeLaFrise = Pick<DossierAnomalie, 'journal' | 'activite'>;

const plafondDansLaPortee = (dossier: DossierDeLaFrise, bornes: BornesDePoignee): string => {
  const portee = finDeLaPortee([Date.parse(bornes.min), ...instantsRecus(pointagesDeLaFrise(dossier), dossier.activite)]);
  return Date.parse(bornes.max) <= portee ? bornes.max : new Date(portee).toISOString();
};

export const bornesDuFait = (dossier: DossierDeLaFrise, maintenant: string): BornesDePoignee => {
  const { min, max } = CadreDuFait.depuis(dossier.activite, maintenant).bornes();
  return { min, max: plafondDansLaPortee(dossier, { min, max }) };
};

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
