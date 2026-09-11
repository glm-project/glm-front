import { IntentionGlobaleDAtelier } from '../domain/designation/fenetre-operateur/ContexteDeGesteDAtelier';

export type IntentionGlobale = IntentionGlobaleDAtelier;

export interface CommandeGlobale {
  executeGlobale(intention: IntentionGlobale): Promise<void>;
}
