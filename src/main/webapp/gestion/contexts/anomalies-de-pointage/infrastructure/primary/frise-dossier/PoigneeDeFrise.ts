import { formatInstantTimeWithOffset } from '@/app/shared/date-format/infrastructure/primary/DateFormats';
import { CadreDuFait } from '../../../domain/acte/CadreDuFait';
import { InstantPointage } from '../../../domain/acte/InstantPointage';
import { PropositionActe } from '../../../domain/acte/SaisieActe';
import { DossierAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { heureDe } from '../PresentationDossier';

const UNE_HEURE = 3_600_000;

export interface BornesDePoignee {
  readonly min: string;
  readonly max: string;
}

export type DemandeDeDeplacement =
  | { readonly kind: 'DE'; readonly minutes: number }
  | { readonly kind: 'BORNE'; readonly borne: 'MIN' | 'MAX' }
  | { readonly kind: 'VERS'; readonly instant: number };

export interface PoigneeDeFrise {
  readonly instant: string;
  readonly origine?: string;
  readonly bornes: BornesDePoignee;
  readonly desactivee: boolean;
}

const heureRepetee = (instant: Date): boolean =>
  [-UNE_HEURE, UNE_HEURE].some(ecart => {
    const autre = new Date(instant.getTime() + ecart);
    return (
      autre.getTimezoneOffset() !== instant.getTimezoneOffset()
      && autre.getHours() === instant.getHours()
      && autre.getMinutes() === instant.getMinutes()
    );
  });

export const texteDeLHeure = (instant: string): string => {
  const date = new Date(instant);
  return heureRepetee(date) ? formatInstantTimeWithOffset(date) : heureDe(instant);
};

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

const terminaUneActivite = (fait: { readonly intention: string }): boolean => fait.intention === 'FIN' || fait.intention === 'TRANSITION';

const poigneeDeLaProposition = (
  proposition: PropositionActe | undefined,
  cadre: CadreDuFait,
  desactivee: boolean,
): PoigneeDeFrise | undefined => {
  if (!proposeUnFait(proposition)) return undefined;
  const fait = proposition.fait;
  if (!terminaUneActivite(fait)) return undefined;
  if (!new InstantPointage(fait.instant).isValid()) return undefined;
  const { min, max } = cadre.bornes(fait);
  if (min === undefined) return undefined;
  return {
    instant: fait.instant,
    ...(proposition.kind === 'CORRECTION' ? { origine: proposition.pointage } : {}),
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

export interface DeplacementDemande {
  readonly demande: DemandeDeDeplacement;
  readonly poignee: PoigneeDeFrise;
}
