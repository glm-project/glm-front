import { formatInstantTimeUnambiguous } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { CadreDuFait } from '../../../domain/acte/CadreDuFait';
import { InstantPointage } from '../../../domain/acte/InstantPointage';
import { PropositionActe, termineUneActivite } from '../../../domain/acte/SaisieActe';
import { DossierAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { finDeLaPortee, instantsRecus } from './EchelleFrise';

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

type DossierDeLaFrise = Pick<DossierAnomalie, 'journal' | 'activites'>;

const plafondDansLaPortee = (dossier: DossierDeLaFrise, maintenant: string): string => {
  const instants = instantsRecus(dossier.journal, dossier.activites);
  if (instants.length === 0) return maintenant;
  const portee = finDeLaPortee(instants);
  return Date.parse(maintenant) <= portee ? maintenant : new Date(portee).toISOString();
};

export const bornesDuDeplacement = (
  cadre: CadreDuFait,
  dossier: DossierDeLaFrise,
  visant: Pick<PoigneeDeFrise, 'activiteVisee' | 'bornes'>,
): BornesDePoignee => ({
  min: visant.bornes.min,
  max: plafondDansLaPortee(dossier, cadre.bornes(visant).max),
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

const bornesDuFait = (
  dossier: DossierDeLaFrise,
  fait: { readonly activiteVisee: string },
  maintenant: string,
): BornesDePoignee | undefined => {
  const { min, max } = CadreDuFait.depuis(dossier.activites, maintenant).bornes(fait);
  return min === undefined ? undefined : { min, max: plafondDansLaPortee(dossier, max) };
};

const poigneeDeLaProposition = (
  dossier: DossierDeLaFrise,
  proposition: PropositionActe | undefined,
  maintenant: string,
  desactivee: boolean,
): PoigneeDeFrise | undefined => {
  if (!proposeUnFaitQuiTermine(proposition)) return undefined;
  const fait = proposition.fait;
  if (!new InstantPointage(fait.instant).isValid()) return undefined;
  const bornes = bornesDuFait(dossier, fait, maintenant);
  if (bornes === undefined) return undefined;
  return {
    instant: fait.instant,
    ...(proposition.kind === 'CORRECTION' ? { origine: proposition.pointage } : {}),
    activiteVisee: fait.activiteVisee,
    bornes,
    desactivee,
  };
};

export const poigneeDuDossier = (
  dossier: DossierDeLaFrise | undefined,
  proposition: PropositionActe | undefined,
  maintenant: string,
  desactivee: boolean,
): PoigneeDeFrise | undefined => (dossier === undefined ? undefined : poigneeDeLaProposition(dossier, proposition, maintenant, desactivee));

const placementDeLaProposition = (
  dossier: DossierDeLaFrise,
  proposition: PropositionActe | undefined,
  maintenant: string,
  desactivee: boolean,
): PlacementDeLInstant | undefined => {
  if (!proposeUnFaitQuiTermine(proposition)) return undefined;
  if (new InstantPointage(proposition.fait.instant).isValid()) return undefined;
  const bornes = bornesDuFait(dossier, proposition.fait, maintenant);
  return bornes === undefined ? undefined : { activiteVisee: proposition.fait.activiteVisee, bornes, desactivee };
};

export const placementDuDossier = (
  dossier: DossierDeLaFrise | undefined,
  proposition: PropositionActe | undefined,
  maintenant: string,
  desactivee: boolean,
): PlacementDeLInstant | undefined =>
  dossier === undefined ? undefined : placementDeLaProposition(dossier, proposition, maintenant, desactivee);

export interface DeplacementDemande {
  readonly demande: DemandeDeDeplacement;
  readonly poignee: PoigneeDeFrise;
}
