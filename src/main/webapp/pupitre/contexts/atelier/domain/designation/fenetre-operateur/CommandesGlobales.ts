import { IntentionGlobaleDAtelier } from './ContexteDeGesteDAtelier';

interface ConstatDesActivites {
  readonly activiteEnCours: boolean;
  readonly pauseEnCours: boolean;
}

const AUTORISATIONS: Record<IntentionGlobaleDAtelier, (constat: ConstatDesActivites) => boolean> = {
  PAUSE: constat => constat.activiteEnCours,
  REPRENDRE: constat => constat.pauseEnCours,
  TOUT_ARRETER: () => true,
};

export class CommandesGlobales {
  constructor(private readonly constat: ConstatDesActivites) {}

  enPause(): boolean {
    return this.constat.pauseEnCours;
  }

  permet(intention: IntentionGlobaleDAtelier): boolean {
    return AUTORISATIONS[intention](this.constat);
  }
}
