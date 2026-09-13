import { FenetreDePresence } from './FenetreDePresence';
import { IdentifiantOperateur } from './IdentifiantOperateur';
import { Instant } from './Instant';

export type EtatSession = 'PRESENT' | 'EN_PAUSE';

export class JourneeDeTravail {
  readonly fenetres: readonly FenetreDePresence[];

  private constructor(
    readonly operateurId: IdentifiantOperateur,
    readonly session: EtatSession | undefined,
    fenetres: readonly FenetreDePresence[],
  ) {
    this.fenetres = [...fenetres];
  }

  static open(operateurId: IdentifiantOperateur, session: EtatSession, fenetres: readonly FenetreDePresence[] = []): JourneeDeTravail {
    return new JourneeDeTravail(operateurId, session, fenetres);
  }

  static closed(operateurId: IdentifiantOperateur, fenetres: readonly FenetreDePresence[] = []): JourneeDeTravail {
    return new JourneeDeTravail(operateurId, undefined, fenetres);
  }

  isOpen(): boolean {
    return this.session !== undefined;
  }

  isFor(operateurId: IdentifiantOperateur): boolean {
    return this.operateurId.equals(operateurId);
  }

  isOpenFor(operateurId: IdentifiantOperateur): boolean {
    return this.isOpen() && this.isFor(operateurId);
  }

  openingInstant(): Instant | undefined {
    return [...this.fenetres].sort((left, right) => left.debut.compare(right.debut))[0]?.debut;
  }
}
