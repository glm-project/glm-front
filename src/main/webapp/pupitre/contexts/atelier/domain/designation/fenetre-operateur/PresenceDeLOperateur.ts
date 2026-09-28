import { EtatDePresence } from '../../journal-du-pupitre/JournalDuPupitre';
import { IntentionGlobaleDAtelier } from './ContexteDeGesteDAtelier';

export type SituationDeLOperateur = EtatDePresence | 'EN_PAUSE';

interface ConstatDePresence {
  readonly etat: EtatDePresence;
  readonly activiteEnCours: boolean;
  readonly pauseEnCours: boolean;
}

const AUTORISATIONS: Record<IntentionGlobaleDAtelier, (constat: ConstatDePresence) => boolean> = {
  PAUSE: constat => constat.activiteEnCours,
  REPRENDRE: constat => constat.pauseEnCours,
  TOUT_ARRETER: () => true,
};

export class PresenceDeLOperateur {
  constructor(private readonly constat: ConstatDePresence) {}

  get situation(): SituationDeLOperateur {
    return this.isShownOnPause() ? 'EN_PAUSE' : this.constat.etat;
  }

  permet(intention: IntentionGlobaleDAtelier): boolean {
    return AUTORISATIONS[intention](this.constat);
  }

  private isShownOnPause(): boolean {
    return this.constat.pauseEnCours && this.constat.etat === 'PRESENT';
  }
}
