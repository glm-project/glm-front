import { IntentionDePointage } from '../../journal-du-pupitre/JournalDuPupitre';

export type TransitionDePointage = IntentionDePointage & { readonly posteId?: string | undefined };

export interface LotDeTransitions {
  readonly premiere: TransitionDePointage;
  readonly suivantes: readonly TransitionDePointage[];
}
