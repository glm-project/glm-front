export type TypePointage = 'DEBUT' | 'NON_CONFORMITE' | 'FIN';
export type IntentionPointage = 'OUVERTURE' | 'TRANSITION' | 'FIN';

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
