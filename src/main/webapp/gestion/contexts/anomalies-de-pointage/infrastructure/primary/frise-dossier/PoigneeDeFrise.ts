import { formatInstantTimeUnambiguous } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { CadreDuFait } from '../../../domain/acte/CadreDuFait';
import { InstantPointage } from '../../../domain/acte/InstantPointage';
import { PropositionActe, termineUneActivite } from '../../../domain/acte/SaisieActe';
import { DossierAnomalie } from '../../../domain/dossier/DossierAnomalie';

export interface BornesDePoignee {
  readonly min: string;
  readonly max: string;
}

export type DemandeDeDeplacement =
  | { readonly kind: 'DE'; readonly minutes: number }
  | { readonly kind: 'BORNE'; readonly borne: 'MIN' | 'MAX' }
  | { readonly kind: 'VERS'; readonly instant: number };

export interface PlacementDeLInstant {
  readonly activiteVisee: string;
  readonly bornes: BornesDePoignee;
  readonly desactivee: boolean;
}

export interface PlacementDemande {
  readonly instant: number;
  readonly placement: PlacementDeLInstant;
}

export interface PoigneeDeFrise {
  readonly instant: string;
  readonly origine?: string;
  readonly activiteVisee: string;
  readonly bornes: BornesDePoignee;
  readonly desactivee: boolean;
}

export const bornesDuDeplacement = (cadre: CadreDuFait, visant: Pick<PoigneeDeFrise, 'activiteVisee' | 'bornes'>): BornesDePoignee => ({
  min: visant.bornes.min,
  max: cadre.bornes(visant).max,
});

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

const proposeUnFait = (proposition: PropositionActe | undefined): proposition is Exclude<PropositionActe, { kind: 'ANNULATION' }> =>
  proposition !== undefined && proposition.kind !== 'ANNULATION';

const proposeUnFaitQuiTermine = (
  proposition: PropositionActe | undefined,
): proposition is Exclude<PropositionActe, { kind: 'ANNULATION' }> => proposeUnFait(proposition) && termineUneActivite(proposition.fait);

const poigneeDeLaProposition = (
  proposition: PropositionActe | undefined,
  cadre: CadreDuFait,
  desactivee: boolean,
): PoigneeDeFrise | undefined => {
  if (!proposeUnFaitQuiTermine(proposition)) return undefined;
  const fait = proposition.fait;
  if (!new InstantPointage(fait.instant).isValid()) return undefined;
  const { min, max } = cadre.bornes(fait);
  if (min === undefined) return undefined;
  if (cadre.depassements(fait).length > 0) return undefined;
  return {
    instant: fait.instant,
    ...(proposition.kind === 'CORRECTION' ? { origine: proposition.pointage } : {}),
    activiteVisee: fait.activiteVisee,
    bornes: { min, max },
    desactivee,
  };
};

export const poigneeDuDossier = (
  dossier: Pick<DossierAnomalie, 'activites'> | undefined,
  proposition: PropositionActe | undefined,
  maintenant: string,
  desactivee: boolean,
): PoigneeDeFrise | undefined =>
  dossier === undefined ? undefined : poigneeDeLaProposition(proposition, CadreDuFait.depuis(dossier.activites, maintenant), desactivee);

const placementDeLaProposition = (
  proposition: PropositionActe | undefined,
  cadre: CadreDuFait,
  desactivee: boolean,
): PlacementDeLInstant | undefined => {
  if (!proposeUnFaitQuiTermine(proposition)) return undefined;
  if (new InstantPointage(proposition.fait.instant).isValid()) return undefined;
  const { min, max } = cadre.bornes(proposition.fait);
  return min === undefined ? undefined : { activiteVisee: proposition.fait.activiteVisee, bornes: { min, max }, desactivee };
};

export const placementDuDossier = (
  dossier: Pick<DossierAnomalie, 'activites'> | undefined,
  proposition: PropositionActe | undefined,
  maintenant: string,
  desactivee: boolean,
): PlacementDeLInstant | undefined =>
  dossier === undefined ? undefined : placementDeLaProposition(proposition, CadreDuFait.depuis(dossier.activites, maintenant), desactivee);

export interface DeplacementDemande {
  readonly demande: DemandeDeDeplacement;
  readonly poignee: PoigneeDeFrise;
}
