export type TypePointage = 'DEBUT' | 'NON_CONFORMITE' | 'FIN';
export type IntentionPointage = 'OUVERTURE' | 'TRANSITION' | 'FIN';

export interface CombinaisonPointage {
  readonly type: TypePointage;
  readonly intention: IntentionPointage;
}

export const COMBINAISONS_VALIDES: readonly CombinaisonPointage[] = [
  { type: 'DEBUT', intention: 'OUVERTURE' },
  { type: 'NON_CONFORMITE', intention: 'OUVERTURE' },
  { type: 'NON_CONFORMITE', intention: 'TRANSITION' },
  { type: 'DEBUT', intention: 'TRANSITION' },
  { type: 'FIN', intention: 'FIN' },
];

export const combinaisonEstValide = (fait: { readonly type: TypePointage | ''; readonly intention: IntentionPointage | '' }): boolean =>
  COMBINAISONS_VALIDES.some(combinaison => combinaison.type === fait.type && combinaison.intention === fait.intention);

export interface FaitPropose {
  readonly type: TypePointage;
  readonly intention: IntentionPointage;
  readonly activiteVisee: string;
  readonly operateur: string;
  readonly poste: string;
  readonly instant: string;
}

export type ActeResolution =
  | { readonly kind: 'REGULARISATION'; readonly fait: FaitPropose }
  | { readonly kind: 'ANNULATION'; readonly pointage: string; readonly motif: string }
  | { readonly kind: 'CORRECTION'; readonly pointage: string; readonly motif: string; readonly fait: FaitPropose };
