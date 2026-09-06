export type IntentionGlobale = 'PAUSE' | 'REPRENDRE' | 'TOUT_ARRETER';

export interface CommandeGlobale {
  executeGlobale(intention: IntentionGlobale): Promise<void>;
}
