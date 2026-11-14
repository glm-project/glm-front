import { SaisieDAjout } from './SaisieDAjout';
import { SaisieDeChangementDePoste } from './SaisieDeChangementDePoste';
import { SaisieDeRegularisation } from './SaisieDeRegularisation';
import { SaisieDeRetrait } from './SaisieDeRetrait';

export type MotifDeChangementDePoste = 'CHEVAUCHEMENT';

export type MotifDAjout = 'CHEVAUCHEMENT' | 'FIN_FUTURE';

export type MotifDeRegularisation = 'FIN_AVANT_LE_DEBUT' | 'FIN_APRES_LA_BORNE' | 'FIN_FUTURE' | 'OPERATEUR_NON_HABILITE';

export type ResultatDeCorrection<Motif = never> =
  | { readonly kind: 'ENREGISTREE' }
  | { readonly kind: 'JOURNEE_CHANGEE' }
  | ([Motif] extends [never] ? never : { readonly kind: 'REFUS'; readonly motif: Motif });

export abstract class CorrectionsPort {
  abstract ajouter(saisie: SaisieDAjout): Promise<ResultatDeCorrection<MotifDAjout>>;
  abstract retirer(saisie: SaisieDeRetrait): Promise<ResultatDeCorrection>;
  abstract changerDePoste(saisie: SaisieDeChangementDePoste): Promise<ResultatDeCorrection<MotifDeChangementDePoste>>;
  abstract regulariserLaFin(saisie: SaisieDeRegularisation): Promise<ResultatDeCorrection<MotifDeRegularisation>>;
}
