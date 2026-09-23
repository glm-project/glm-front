import { EtatDePresence } from '../../journal-du-pupitre/JournalDuPupitre';
import { IntentionGlobaleDAtelier } from './ContexteDeGesteDAtelier';

const AUTORISATIONS: Record<EtatDePresence, Record<IntentionGlobaleDAtelier, boolean>> = {
  ABSENT: { PAUSE: true, REPRENDRE: true, TOUT_ARRETER: true },
  PRESENT: { PAUSE: true, REPRENDRE: false, TOUT_ARRETER: true },
  EN_PAUSE: { PAUSE: false, REPRENDRE: true, TOUT_ARRETER: true },
};

export class PresenceDeLOperateur {
  constructor(readonly etat: EtatDePresence) {}

  permet(intention: IntentionGlobaleDAtelier): boolean {
    return AUTORISATIONS[this.etat][intention];
  }
}
