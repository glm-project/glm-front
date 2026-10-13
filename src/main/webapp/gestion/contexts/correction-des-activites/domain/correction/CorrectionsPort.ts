import { SaisieDeRetrait } from './SaisieDeRetrait';

export type ResultatDeCorrection<Motif = never> =
  | { readonly kind: 'ENREGISTREE' }
  | { readonly kind: 'JOURNEE_CHANGEE' }
  | ([Motif] extends [never] ? never : { readonly kind: 'REFUS'; readonly motif: Motif });

export abstract class CorrectionsPort {
  abstract retirer(saisie: SaisieDeRetrait): Promise<ResultatDeCorrection>;
}
