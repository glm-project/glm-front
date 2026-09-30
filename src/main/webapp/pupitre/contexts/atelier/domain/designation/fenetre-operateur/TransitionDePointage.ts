import { TypeDOuverture } from '../../journal-du-pupitre/JournalDuPupitre';

export type TransitionDePointage = { readonly posteId?: string } & (
  | { readonly intention: 'OUVERTURE'; readonly type: TypeDOuverture }
  | { readonly intention: 'TRANSITION'; readonly type: TypeDOuverture; readonly cible: string }
  | { readonly intention: 'FIN'; readonly type: 'FIN'; readonly cible: string }
);

export interface LotDeTransitions {
  readonly premiere: TransitionDePointage;
  readonly suivantes: readonly TransitionDePointage[];
}
