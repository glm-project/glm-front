import { IntentionGlobaleDAtelier } from '../domain/designation/FenetreOperateur';
import { IdentiteDuGeste } from '../domain/journal-du-pupitre/JournalDuPupitre';

export type IntentionGlobale = IntentionGlobaleDAtelier;

export interface IntentionGlobaleInitiee extends IdentiteDuGeste {
  readonly commande: IntentionGlobale;
}

export interface CommandeGlobale {
  executeGlobale(intention: IntentionGlobale): Promise<void>;
}
