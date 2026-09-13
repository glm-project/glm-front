import { EtatDePresence } from './EtatDePresence';
import { FenetreDePresence } from './FenetreDePresence';
import { IdentifiantOperateur } from './IdentifiantOperateur';

export class JourneeDeTravail {
  private constructor(
    readonly operateurId: IdentifiantOperateur,
    readonly etat: EtatDePresence,
    readonly fenetres: readonly FenetreDePresence[],
  ) {}

  static open(
    operateurId: IdentifiantOperateur,
    etat: 'PRESENT' | 'EN_PAUSE',
    fenetres: readonly FenetreDePresence[] = [],
  ): JourneeDeTravail {
    return new JourneeDeTravail(operateurId, etat, fenetres);
  }

  static closed(operateurId: IdentifiantOperateur, fenetres: readonly FenetreDePresence[] = []): JourneeDeTravail {
    return new JourneeDeTravail(operateurId, 'ABSENT', fenetres);
  }

  isOpenFor(operateurId: IdentifiantOperateur): boolean {
    if (this.etat === 'ABSENT') {
      return false;
    }
    return this.operateurId.equals(operateurId);
  }
}
