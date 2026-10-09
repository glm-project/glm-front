import { ActiviteAnomalieId } from '../dossier/ActiviteAnomalieId';
import { SuiviAnomalieId } from '../dossier/SuiviAnomalieId';

export const CODES_REFUS_REGULARISATION = [
  'activite-visee-introuvable',
  'activite-deja-regularisee',
  'activite-non-echue',
  'date-de-survenue-future',
  'fin-avant-debut',
  'fin-apres-borne',
] as const;

export type CodeRefusRegularisation = (typeof CODES_REFUS_REGULARISATION)[number];

export interface CommandeDeRegularisation {
  readonly suivi: SuiviAnomalieId;
  readonly id: string;
  readonly activite: ActiviteAnomalieId;
  readonly dateDeSurvenue: string;
}

export type ResultatDeRegularisation =
  { readonly kind: 'REGULARISEE' } | { readonly kind: 'REFUS'; readonly code: CodeRefusRegularisation } | { readonly kind: 'CONCURRENCE' };

export abstract class RegularisationPort {
  abstract regulariser(commande: CommandeDeRegularisation): Promise<ResultatDeRegularisation>;
}
