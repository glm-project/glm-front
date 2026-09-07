import { IdentiteDuGeste } from '../journal-du-pupitre/JournalDuPupitre';
import { FenetreOperateur, IntentionGlobaleDAtelier, LotDeGestesDAtelier } from './FenetreOperateur';

export class IntentionGlobaleInitiee {
  private readonly origine: IdentiteDuGeste;

  constructor(
    private readonly commande: IntentionGlobaleDAtelier,
    origine: IdentiteDuGeste,
  ) {
    this.origine = { ...origine };
  }

  prepare(fenetre: FenetreOperateur): LotDeGestesDAtelier {
    const identify = this.identities();
    if (this.commande === 'TOUT_ARRETER') return fenetre.prepareToutArreter(identify);
    return fenetre.preparePresence(this.commande === 'REPRENDRE' ? 'REPRISE' : 'PAUSE', identify);
  }

  private identities(): () => IdentiteDuGeste {
    const prefix = this.origine.id.slice(0, -8);
    const firstSuffix = Number.parseInt(this.origine.id.slice(-8), 16);
    let offset = 0;
    return () => {
      const suffix = ((firstSuffix + offset) >>> 0).toString(16).padStart(8, '0');
      offset += 1;
      return { id: `${prefix}${suffix}`, dateDeSurvenue: this.origine.dateDeSurvenue };
    };
  }
}
