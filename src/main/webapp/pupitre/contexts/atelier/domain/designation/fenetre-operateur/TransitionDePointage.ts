import { TypeDePointage } from '../../journal-du-pupitre/JournalDuPupitre';

export interface TransitionDePointage {
  readonly type: TypeDePointage;
  readonly posteId?: string;
}

export interface LotDeTransitions {
  readonly premiere: TransitionDePointage;
  readonly suivantes: readonly TransitionDePointage[];
}
