import { IntentionDePointage } from '../../journal-du-pupitre/JournalDuPupitre';

export type TransitionDePointage = IntentionDePointage & { readonly posteId?: string };

export interface LotDeTransitions {
  readonly premiere: TransitionDePointage;
  readonly suivantes: readonly TransitionDePointage[];
}
