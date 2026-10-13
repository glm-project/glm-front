import { SaisieDeChangementDePoste } from './SaisieDeChangementDePoste';
import { SaisieDeRetrait } from './SaisieDeRetrait';

export type MotifDeChangementDePoste = 'CHEVAUCHEMENT';

export type ResultatDeCorrection<Motif = never> =
  | { readonly kind: 'ENREGISTREE' }
  | { readonly kind: 'JOURNEE_CHANGEE' }
  | ([Motif] extends [never] ? never : { readonly kind: 'REFUS'; readonly motif: Motif });

export abstract class CorrectionsPort {
  abstract retirer(saisie: SaisieDeRetrait): Promise<ResultatDeCorrection>;
  abstract changerDePoste(saisie: SaisieDeChangementDePoste): Promise<ResultatDeCorrection<MotifDeChangementDePoste>>;
}
