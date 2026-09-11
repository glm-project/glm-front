import { GesteDAtelier } from '../../journal-du-pupitre/JournalDuPupitre';
import { ContextesParGeste } from '../ContextesParGeste';
import { NumeroDElement } from '../NumeroDElement';
import { FenetreOperateur } from './FenetreOperateur';
import { PosteAChoisir } from './HabilitationsDePoste';

export type CibleDePointage = 'PRINCIPALE' | 'SECONDAIRE';

export interface LotDeGestesDAtelier {
  readonly kind: 'GESTES';
  readonly capture: (arriveeAssuree?: boolean) => readonly GesteDAtelier[];
  readonly contextesParGeste: ContextesParGeste;
  readonly intention: number;
}

export interface AcceptationDeGestes {
  readonly gestes: readonly GesteDAtelier[];
  readonly applyTo: (fenetre: FenetreOperateur) => FenetreOperateur;
}

export interface DecisionResult {
  readonly fenetre: FenetreOperateur;
  readonly decision: DecisionDePointage;
}

export interface GestesDecisionResult {
  readonly fenetre: FenetreOperateur;
  readonly decision: LotDeGestesDAtelier;
}

export interface ChoixDePosteRequis {
  readonly kind: 'CHOIX_POSTE_REQUIS';
  readonly numero: NumeroDElement;
  readonly postes: readonly PosteAChoisir[];
}

export type DecisionDePointage = LotDeGestesDAtelier | ChoixDePosteRequis;
