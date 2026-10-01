import { IdentiteDuGeste } from '../journal-du-pupitre/JournalDuPupitre';
import { SuiteDIdentitesDeGestes } from '../journal-du-pupitre/SuiteDIdentitesDeGestes';
import { IntentionGlobaleDAtelier } from './fenetre-operateur/ContexteDeGesteDAtelier';
import { LotDeGestesDAtelier } from './fenetre-operateur/DecisionDePointage';
import { FenetreOperateur } from './fenetre-operateur/FenetreOperateur';

export class IntentionGlobaleInitiee {
  private readonly racine: string;
  private readonly origine: SuiteDIdentitesDeGestes;

  constructor(
    private readonly commande: IntentionGlobaleDAtelier,
    origine: IdentiteDuGeste,
  ) {
    this.racine = origine.id;
    this.origine = SuiteDIdentitesDeGestes.from(origine);
  }

  prepare(fenetre: FenetreOperateur): LotDeGestesDAtelier {
    const identify = this.identities();
    const active = fenetre.afterEvaluatingAt(Date.parse(this.origine.identite().dateDeSurvenue));
    switch (this.commande) {
      case 'PAUSE':
        return active.preparePause(identify, this.racine);
      case 'REPRENDRE':
        return active.prepareReprise(identify);
      case 'TOUT_ARRETER':
        return active.prepareToutArreter(identify);
    }
  }

  private identities(): () => IdentiteDuGeste {
    let suite = this.origine;
    return () => {
      const identite = suite.identite();
      suite = suite.next();
      return identite;
    };
  }
}
