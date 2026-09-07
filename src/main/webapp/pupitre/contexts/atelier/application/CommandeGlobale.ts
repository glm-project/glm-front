import { IntentionGlobaleDAtelier } from '../domain/designation/FenetreOperateur';

export type IntentionGlobale = IntentionGlobaleDAtelier;

export interface CommandeGlobale {
  executeGlobale(intention: IntentionGlobale): Promise<void>;
}
