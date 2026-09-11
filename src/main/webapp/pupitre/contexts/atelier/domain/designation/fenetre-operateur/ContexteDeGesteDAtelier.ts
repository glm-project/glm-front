import { NumeroDElement } from '../NumeroDElement';

export type IntentionGlobaleDAtelier = 'PAUSE' | 'REPRENDRE' | 'TOUT_ARRETER';

export type ContexteDeGesteDAtelier =
  | { readonly kind: 'ELEMENT'; readonly numero: NumeroDElement }
  | { readonly kind: 'COMMANDE_GLOBALE'; readonly intention: IntentionGlobaleDAtelier };

export interface MessageDAtelier {
  readonly contexte?: ContexteDeGesteDAtelier;
  readonly message: string;
}

export interface RefusDAtelier extends MessageDAtelier {
  readonly contexte: ContexteDeGesteDAtelier;
}
