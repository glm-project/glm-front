import { CibleDePointage, PosteAChoisir } from '../domain/designation/FenetreOperateur';

export interface IntentionDePointage {
  readonly suiviId: string;
  readonly cible: CibleDePointage;
}

export interface CaptureDePointage {
  readonly kind: 'CAPTURE';
  readonly completion: Promise<void>;
}

export interface ChoixDePosteDePointage {
  readonly kind: 'CHOIX_POSTE_REQUIS';
  readonly numero: string;
  readonly postes: readonly PosteAChoisir[];
  readonly choose: (posteId: string) => Promise<void>;
}

export interface PointageIndisponible {
  readonly kind: 'INDISPONIBLE';
}

export type ExecutionDePointage = CaptureDePointage | ChoixDePosteDePointage | PointageIndisponible;

export interface PointageCommand {
  execute: (intention: IntentionDePointage) => ExecutionDePointage;
}
